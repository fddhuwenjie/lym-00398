const EPSILON = 1e-10;
const MAX_ITERATIONS = 100;

export function solveKepler(M: number, e: number): number {
  if (e < 0 || e >= 1) {
    throw new Error('Eccentricity must be in [0, 1) for elliptical orbits');
  }

  M = normalizeAngle(M);

  let E: number;
  if (e < 0.8) {
    E = M;
  } else {
    E = Math.PI;
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const sinE = Math.sin(E);
    const cosE = Math.cos(E);
    const f = E - e * sinE - M;
    const fPrime = 1 - e * cosE;

    if (Math.abs(f) < EPSILON) {
      return E;
    }

    const delta = f / fPrime;
    E = E - delta;

    if (Math.abs(delta) < EPSILON) {
      return E;
    }
  }

  return E;
}

export function eccentricToTrueAnomaly(E: number, e: number): number {
  const cosE = Math.cos(E);
  const cosV = (cosE - e) / (1 - e * cosE);
  const sinV = (Math.sqrt(1 - e * e) * Math.sin(E)) / (1 - e * cosE);
  return Math.atan2(sinV, cosV);
}

export function meanToTrueAnomaly(M: number, e: number): number {
  const E = solveKepler(M, e);
  return eccentricToTrueAnomaly(E, e);
}

export function trueToEccentricAnomaly(v: number, e: number): number {
  const cosV = Math.cos(v);
  const cosE = (e + cosV) / (1 + e * cosV);
  const sinE = (Math.sqrt(1 - e * e) * Math.sin(v)) / (1 + e * cosV);
  return Math.atan2(sinE, cosE);
}

export function normalizeAngle(angle: number): number {
  angle = angle % (2 * Math.PI);
  if (angle < 0) {
    angle += 2 * Math.PI;
  }
  return angle;
}

export function getMeanAnomaly(M0: number, period: number, t: number): number {
  const n = (2 * Math.PI) / period;
  return M0 + n * t;
}
