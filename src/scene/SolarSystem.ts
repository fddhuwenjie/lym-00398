import * as THREE from 'three';
import { BodyData, ScaleMode, SimulationMode } from '../types';
import { SUN_DATA, PLANET_DATA, MOON_DATA } from '../data/bodies';
import { createSun, createPlanet, createMoon, createSaturnRings } from './bodies';
import { createOrbitLine } from './orbit';
import { createStarField } from './starfield';
import { orbitalElementsToPosition, orbitalElementsToVelocity, eclipticToThreeJs, Vector3 } from '../astro/coordinates';
import { getDistanceScale, SCALE_CONFIG } from './scale';
import { NBodyState, OrbitalEnergyInfo, createNBodyState, integrateNBody, predictTrajectories, computeOrbitalEnergies, computeTotalSystemEnergy } from '../astro/nbody';
import { createTrajectoryLine } from './trajectory';

export interface BodyObject {
  data: BodyData;
  mesh: THREE.Mesh;
  orbitLine?: THREE.Line;
  parentObject?: THREE.Object3D;
  ringMesh?: THREE.Mesh | null;
  predictionLine?: THREE.Line | null;
}

const SUN_MASS_SOLAR = 1.0;
const KG_PER_SOLAR_MASS = 1.989e30;

export class SolarSystem {
  public scene: THREE.Scene;
  public bodies: Map<string, BodyObject> = new Map();
  public sunMesh!: THREE.Mesh;
  public scaleMode: ScaleMode = 'exaggerated';
  public simulationMode: SimulationMode = 'kepler';

  private starField!: THREE.Points;
  private nbodyState: NBodyState | null = null;
  private nbodyCurrentJD: number = 0;
  private initialSystemEnergy: number = 0;
  private predictionLines: Map<string, THREE.Line> = new Map();
  private predictionData: Map<string, Vector3[]> | null = null;
  private showPredictions: boolean = false;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000011);
  }

  public init(): void {
    this.starField = createStarField(8000, 500);
    this.scene.add(this.starField);

    const ambientLight = new THREE.AmbientLight(0x333333, 0.5);
    this.scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffffff, 2.0, 0, 0);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);

    this.createSun();
    this.createPlanets();
    this.createMoons();
  }

  private createSun(): void {
    this.sunMesh = createSun(SUN_DATA, this.scaleMode);
    this.scene.add(this.sunMesh);
    this.bodies.set(SUN_DATA.name, {
      data: SUN_DATA,
      mesh: this.sunMesh,
    });
  }

  private createPlanets(): void {
    for (const planetData of PLANET_DATA) {
      const mesh = createPlanet(planetData, this.scaleMode);
      const orbitLine = createOrbitLine(planetData.orbitalElements!, planetData.color, this.scaleMode);

      this.scene.add(mesh);
      this.scene.add(orbitLine);

      const bodyObj: BodyObject = {
        data: planetData,
        mesh,
        orbitLine,
      };

      if (planetData.hasRing) {
        const ring = createSaturnRings(planetData, this.scaleMode);
        if (ring) {
          mesh.add(ring);
          bodyObj.ringMesh = ring;
        }
      }

      this.bodies.set(planetData.name, bodyObj);
    }
  }

  private createMoons(): void {
    const sizeMultiplier = SCALE_CONFIG[this.scaleMode].sizeMultiplier;

    for (const moonData of MOON_DATA) {
      const parent = this.bodies.get(moonData.parent!);
      if (!parent) continue;

      const moonSystem = new THREE.Group();
      moonSystem.name = `${moonData.name}System`;
      moonSystem.scale.setScalar(sizeMultiplier);
      parent.mesh.add(moonSystem);

      const mesh = createMoon(moonData, this.scaleMode);
      moonSystem.add(mesh);

      const orbitLine = createOrbitLine(moonData.orbitalElements!, 0x666688, this.scaleMode, 128);
      moonSystem.add(orbitLine);

      this.bodies.set(moonData.name, {
        data: moonData,
        mesh,
        orbitLine,
        parentObject: moonSystem,
      });
    }
  }

  public setSimulationMode(mode: SimulationMode): void {
    if (this.simulationMode === mode) return;
    this.simulationMode = mode;

    if (mode === 'nbody') {
      this.clearPredictionLines();
      this.showPredictions = false;
    }
  }

  public initNBody(daysSinceJ2000: number): void {
    const bodyInitData: Array<{ name: string; mass: number; pos: Vector3; vel: Vector3 }> = [];

    bodyInitData.push({
      name: 'Sun',
      mass: SUN_MASS_SOLAR,
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
    });

    for (const planetData of PLANET_DATA) {
      if (!planetData.orbitalElements) continue;
      const massSolar = planetData.mass / KG_PER_SOLAR_MASS;
      const pos = orbitalElementsToPosition(planetData.orbitalElements, daysSinceJ2000);
      const vel = orbitalElementsToVelocity(planetData.orbitalElements, daysSinceJ2000);
      bodyInitData.push({ name: planetData.name, mass: massSolar, pos, vel });
    }

    this.nbodyState = createNBodyState(bodyInitData);
    this.nbodyCurrentJD = daysSinceJ2000;
    this.initialSystemEnergy = computeTotalSystemEnergy(this.nbodyState);
  }

  public updateNBody(deltaDays: number): void {
    if (!this.nbodyState) return;

    const dt = 0.5;
    const steps = Math.max(1, Math.round(Math.abs(deltaDays) / dt));
    const actualDt = deltaDays / steps;

    integrateNBody(this.nbodyState, actualDt, steps);
    this.nbodyCurrentJD += deltaDays;
  }

  public update(daysSinceJ2000: number): void {
    const distanceScale = getDistanceScale(this.scaleMode);

    if (this.simulationMode === 'nbody' && this.nbodyState) {
      for (const bodyObj of this.bodies.values()) {
        if (bodyObj.data.type === 'moon' || !bodyObj.data.orbitalElements) continue;

        const nbodyBody = this.nbodyState.bodies.find(b => b.name === bodyObj.data.name);
        if (!nbodyBody) continue;

        const threePos = eclipticToThreeJs(nbodyBody.pos);
        bodyObj.mesh.position.set(
          threePos.x * distanceScale,
          threePos.y * distanceScale,
          threePos.z * distanceScale
        );
      }

      for (const moonData of MOON_DATA) {
        const moonBody = this.bodies.get(moonData.name);
        if (!moonBody || !moonData.orbitalElements) continue;

        const pos = orbitalElementsToPosition(moonData.orbitalElements, daysSinceJ2000);
        const threePos = eclipticToThreeJs(pos);
        moonBody.mesh.position.set(
          threePos.x * distanceScale,
          threePos.y * distanceScale,
          threePos.z * distanceScale
        );
      }
    } else {
      for (const bodyObj of this.bodies.values()) {
        if (!bodyObj.data.orbitalElements) continue;

        const pos = orbitalElementsToPosition(bodyObj.data.orbitalElements, daysSinceJ2000);
        const threePos = eclipticToThreeJs(pos);

        if (bodyObj.data.type === 'planet') {
          bodyObj.mesh.position.set(
            threePos.x * distanceScale,
            threePos.y * distanceScale,
            threePos.z * distanceScale
          );
        } else if (bodyObj.data.type === 'moon' && bodyObj.parentObject) {
          bodyObj.mesh.position.set(
            threePos.x * distanceScale,
            threePos.y * distanceScale,
            threePos.z * distanceScale
          );
        }
      }
    }
  }

  public computePrediction(durationYears: number = 100): void {
    if (!this.nbodyState) return;

    const durationDays = durationYears * 365.25;
    const sampleIntervalDays = 30;

    const trajectories = predictTrajectories(this.nbodyState, durationDays, sampleIntervalDays);

    this.predictionData = new Map(trajectories);
    this.createPredictionLinesFromData();

    this.showPredictions = true;
  }

  private createPredictionLinesFromData(): void {
    if (!this.predictionData) return;

    this.clearPredictionLines();

    for (const [name, points] of this.predictionData) {
      const bodyObj = this.bodies.get(name);
      if (!bodyObj || points.length < 2) continue;

      const color = bodyObj.data.color;
      const line = createTrajectoryLine(points, color, this.scaleMode);
      this.scene.add(line);
      this.predictionLines.set(name, line);
      bodyObj.predictionLine = line;
    }
  }

  private clearPredictionLines(): void {
    for (const [name, line] of this.predictionLines) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
      const bodyObj = this.bodies.get(name);
      if (bodyObj) bodyObj.predictionLine = null;
    }
    this.predictionLines.clear();
  }

  public hidePredictions(): void {
    this.clearPredictionLines();
    this.predictionData = null;
    this.showPredictions = false;
  }

  public isShowingPredictions(): boolean {
    return this.showPredictions;
  }

  public getOrbitalEnergies(): OrbitalEnergyInfo[] | null {
    if (!this.nbodyState) return null;
    return computeOrbitalEnergies(this.nbodyState);
  }

  public getSystemEnergy(): { total: number; initial: number; driftPercent: number } | null {
    if (!this.nbodyState || this.initialSystemEnergy === 0) return null;
    const current = computeTotalSystemEnergy(this.nbodyState);
    const driftPercent = ((current - this.initialSystemEnergy) / Math.abs(this.initialSystemEnergy)) * 100;
    return { total: current, initial: this.initialSystemEnergy, driftPercent };
  }

  public getNBodyState(): NBodyState | null {
    return this.nbodyState;
  }

  public getBodyPosition(name: string): THREE.Vector3 | null {
    const body = this.bodies.get(name);
    if (!body) return null;

    const worldPos = new THREE.Vector3();
    body.mesh.getWorldPosition(worldPos);
    return worldPos;
  }

  public setScaleMode(mode: ScaleMode): void {
    if (this.scaleMode === mode) return;
    this.scaleMode = mode;
    this.rebuildScene();
  }

  private rebuildScene(): void {
    const hadPredictions = this.showPredictions;

    this.clearPredictionLines();

    for (const bodyObj of this.bodies.values()) {
      this.scene.remove(bodyObj.mesh);
      if (bodyObj.orbitLine) {
        this.scene.remove(bodyObj.orbitLine);
      }
      if (bodyObj.ringMesh) {
        bodyObj.mesh.remove(bodyObj.ringMesh);
      }
    }
    this.bodies.clear();

    if (this.starField) {
      this.scene.remove(this.starField);
    }

    this.init();

    if (hadPredictions && this.predictionData) {
      this.createPredictionLinesFromData();
      this.showPredictions = true;
    }
  }

  public getClickableObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    for (const bodyObj of this.bodies.values()) {
      objects.push(bodyObj.mesh);
    }
    return objects;
  }

  public getBodyByMesh(mesh: THREE.Object3D): BodyData | null {
    for (const bodyObj of this.bodies.values()) {
      if (bodyObj.mesh === mesh || bodyObj.mesh.children.includes(mesh as THREE.Mesh)) {
        return bodyObj.data;
      }
    }
    return null;
  }
}
