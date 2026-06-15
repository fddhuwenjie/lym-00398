import { meanToTrueAnomaly, getMeanAnomaly } from './kepler';
import { OrbitalElements } from '../types';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export function orbitalElementsToPosition(
  elements: OrbitalElements,
  t: number
): Vector3 {
  const M = getMeanAnomaly(elements.M0, elements.period, t);
  const v = meanToTrueAnomaly(M, elements.e);

  const r = elements.a * (1 - elements.e * elements.e) / (1 + elements.e * Math.cos(v));

  const xOrbital = r * Math.cos(v);
  const yOrbital = r * Math.sin(v);

  const cosOmega = Math.cos(elements.Omega);
  const sinOmega = Math.sin(elements.Omega);
  const cosI = Math.cos(elements.i);
  const sinI = Math.sin(elements.i);
  const cosOmegaBar = Math.cos(elements.omega);
  const sinOmegaBar = Math.sin(elements.omega);

  const x = (cosOmega * cosOmegaBar - sinOmega * sinOmegaBar * cosI) * xOrbital +
            (-cosOmega * sinOmegaBar - sinOmega * cosOmegaBar * cosI) * yOrbital;
  const y = (sinOmega * cosOmegaBar + cosOmega * sinOmegaBar * cosI) * xOrbital +
            (-sinOmega * sinOmegaBar + cosOmega * cosOmegaBar * cosI) * yOrbital;
  const z = (sinOmegaBar * sinI) * xOrbital +
            (cosOmegaBar * sinI) * yOrbital;

  return { x, y, z };
}

export function eclipticToThreeJs(pos: Vector3): Vector3 {
  return {
    x: pos.x,
    y: pos.z,
    z: -pos.y,
  };
}

export function threeJsToEcliptic(pos: Vector3): Vector3 {
  return {
    x: pos.x,
    y: -pos.z,
    z: pos.y,
  };
}

export function getOrbitPoints(
  elements: OrbitalElements,
  segments: number = 256
): Vector3[] {
  const points: Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const v = (i / segments) * 2 * Math.PI;
    const r = elements.a * (1 - elements.e * elements.e) / (1 + elements.e * Math.cos(v));

    const xOrbital = r * Math.cos(v);
    const yOrbital = r * Math.sin(v);

    const cosOmega = Math.cos(elements.Omega);
    const sinOmega = Math.sin(elements.Omega);
    const cosI = Math.cos(elements.i);
    const sinI = Math.sin(elements.i);
    const cosOmegaBar = Math.cos(elements.omega);
    const sinOmegaBar = Math.sin(elements.omega);

    const x = (cosOmega * cosOmegaBar - sinOmega * sinOmegaBar * cosI) * xOrbital +
              (-cosOmega * sinOmegaBar - sinOmega * cosOmegaBar * cosI) * yOrbital;
    const y = (sinOmega * cosOmegaBar + cosOmega * sinOmegaBar * cosI) * xOrbital +
              (-sinOmega * sinOmegaBar + cosOmega * cosOmegaBar * cosI) * yOrbital;
    const z = (sinOmegaBar * sinI) * xOrbital +
              (cosOmegaBar * sinI) * yOrbital;

    points.push({ x, y, z });
  }

  return points;
}

export function getOrbitalPeriod(a: number, mu: number = 1.32712440018e20): number {
  return 2 * Math.PI * Math.sqrt((a * 1000) ** 3 / mu) / 86400;
}
