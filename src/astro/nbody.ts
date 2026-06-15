import { Vector3 } from './coordinates';

const G = 2.95912208286e-4;

const SOLAR_MASS = 1.0;
const AU_PER_DAY_TO_KM_PER_S = 149597870.7 / 86400.0;

export interface NBodyBody {
  name: string;
  mass: number;
  pos: Vector3;
  vel: Vector3;
  acc: Vector3;
}

export interface NBodyState {
  bodies: NBodyBody[];
  time: number;
}

export interface OrbitalEnergyInfo {
  name: string;
  kinetic: number;
  potential: number;
  total: number;
}

export function createNBodyState(
  bodyData: Array<{ name: string; mass: number; pos: Vector3; vel: Vector3 }>
): NBodyState {
  const bodies: NBodyBody[] = bodyData.map(d => ({
    name: d.name,
    mass: d.mass,
    pos: { ...d.pos },
    vel: { ...d.vel },
    acc: { x: 0, y: 0, z: 0 },
  }));

  computeAccelerations(bodies);

  return { bodies, time: 0 };
}

function computeAccelerations(bodies: NBodyBody[]): void {
  for (const body of bodies) {
    body.acc.x = 0;
    body.acc.y = 0;
    body.acc.z = 0;
  }

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const bi = bodies[i];
      const bj = bodies[j];

      const dx = bj.pos.x - bi.pos.x;
      const dy = bj.pos.y - bi.pos.y;
      const dz = bj.pos.z - bi.pos.z;

      const r2 = dx * dx + dy * dy + dz * dz;
      const r = Math.sqrt(r2);
      const r3 = r2 * r;

      const softening = 1e-10;
      const r3s = r3 + softening;

      const fj = G * bj.mass / r3s;
      const fi = G * bi.mass / r3s;

      bi.acc.x += fj * dx;
      bi.acc.y += fj * dy;
      bi.acc.z += fj * dz;

      bj.acc.x -= fi * dx;
      bj.acc.y -= fi * dy;
      bj.acc.z -= fi * dz;
    }
  }
}

export function velocityVerletStep(state: NBodyState, dt: number): void {
  const { bodies } = state;

  for (const body of bodies) {
    body.pos.x += body.vel.x * dt + 0.5 * body.acc.x * dt * dt;
    body.pos.y += body.vel.y * dt + 0.5 * body.acc.y * dt * dt;
    body.pos.z += body.vel.z * dt + 0.5 * body.acc.z * dt * dt;
  }

  const oldAcc = bodies.map(b => ({ x: b.acc.x, y: b.acc.y, z: b.acc.z }));

  computeAccelerations(bodies);

  for (let i = 0; i < bodies.length; i++) {
    bodies[i].vel.x += 0.5 * (oldAcc[i].x + bodies[i].acc.x) * dt;
    bodies[i].vel.y += 0.5 * (oldAcc[i].y + bodies[i].acc.y) * dt;
    bodies[i].vel.z += 0.5 * (oldAcc[i].z + bodies[i].acc.z) * dt;
  }

  state.time += dt;
}

export function integrateNBody(state: NBodyState, dt: number, steps: number): void {
  for (let s = 0; s < steps; s++) {
    velocityVerletStep(state, dt);
  }
}

export function predictTrajectories(
  state: NBodyState,
  durationDays: number,
  sampleIntervalDays: number
): Map<string, Vector3[]> {
  const trajectories = new Map<string, Vector3[]>();
  for (const body of state.bodies) {
    trajectories.set(body.name, [{ ...body.pos }]);
  }

  const cloned: NBodyBody[] = state.bodies.map(b => ({
    name: b.name,
    mass: b.mass,
    pos: { ...b.pos },
    vel: { ...b.vel },
    acc: { ...b.acc },
  }));

  const cloneState: NBodyState = { bodies: cloned, time: state.time };

  const dt = 0.5;
  const stepsPerSample = Math.max(1, Math.round(sampleIntervalDays / dt));
  const totalSteps = Math.ceil(durationDays / dt);
  let stepsDone = 0;
  let nextSample = stepsPerSample;

  while (stepsDone < totalSteps) {
    velocityVerletStep(cloneState, dt);
    stepsDone++;

    if (stepsDone >= nextSample) {
      for (const body of cloneState.bodies) {
        trajectories.get(body.name)?.push({ ...body.pos });
      }
      nextSample += stepsPerSample;
    }
  }

  return trajectories;
}

export function computeOrbitalEnergies(state: NBodyState): OrbitalEnergyInfo[] {
  const results: OrbitalEnergyInfo[] = [];

  for (let i = 0; i < state.bodies.length; i++) {
    const bi = state.bodies[i];
    const v2 = bi.vel.x * bi.vel.x + bi.vel.y * bi.vel.y + bi.vel.z * bi.vel.z;
    const kinetic = 0.5 * v2;

    let potential = 0;
    for (let j = 0; j < state.bodies.length; j++) {
      if (i === j) continue;
      const bj = state.bodies[j];
      const dx = bj.pos.x - bi.pos.x;
      const dy = bj.pos.y - bi.pos.y;
      const dz = bj.pos.z - bi.pos.z;
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      potential -= G * bj.mass / r;
    }

    results.push({
      name: bi.name,
      kinetic,
      potential,
      total: kinetic + potential,
    });
  }

  return results;
}

export function computeTotalSystemEnergy(state: NBodyState): number {
  let totalKE = 0;
  let totalPE = 0;

  for (let i = 0; i < state.bodies.length; i++) {
    const bi = state.bodies[i];
    const v2 = bi.vel.x * bi.vel.x + bi.vel.y * bi.vel.y + bi.vel.z * bi.vel.z;
    totalKE += 0.5 * bi.mass * v2;

    for (let j = i + 1; j < state.bodies.length; j++) {
      const bj = state.bodies[j];
      const dx = bj.pos.x - bi.pos.x;
      const dy = bj.pos.y - bi.pos.y;
      const dz = bj.pos.z - bi.pos.z;
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      totalPE -= G * bi.mass * bj.mass / r;
    }
  }

  return totalKE + totalPE;
}

export function getBodyPositionAU(state: NBodyState, name: string): Vector3 | null {
  const body = state.bodies.find(b => b.name === name);
  return body ? { ...body.pos } : null;
}

export function auPerDayToKmPerS(v: number): number {
  return v * AU_PER_DAY_TO_KM_PER_S;
}

export { SOLAR_MASS, G };
