import * as THREE from 'three';
import { BodyData, ScaleMode } from '../types';
import { SUN_DATA, PLANET_DATA, MOON_DATA } from '../data/bodies';
import { createSun, createPlanet, createMoon, createSaturnRings } from './bodies';
import { createOrbitLine } from './orbit';
import { createStarField } from './starfield';
import { orbitalElementsToPosition, eclipticToThreeJs } from '../astro/coordinates';
import { getDistanceScale, SCALE_CONFIG } from './scale';

export interface BodyObject {
  data: BodyData;
  mesh: THREE.Mesh;
  orbitLine?: THREE.Line;
  parentObject?: THREE.Object3D;
  ringMesh?: THREE.Mesh | null;
}

export class SolarSystem {
  public scene: THREE.Scene;
  public bodies: Map<string, BodyObject> = new Map();
  public sunMesh!: THREE.Mesh;
  public scaleMode: ScaleMode = 'exaggerated';

  private starField!: THREE.Points;

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

  public update(daysSinceJ2000: number): void {
    const distanceScale = getDistanceScale(this.scaleMode);

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
