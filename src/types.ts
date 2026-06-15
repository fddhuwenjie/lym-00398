export interface OrbitalElements {
  a: number;
  e: number;
  i: number;
  Omega: number;
  omega: number;
  M0: number;
  period: number;
}

export interface BodyData {
  name: string;
  nameCn: string;
  type: 'star' | 'planet' | 'moon';
  radius: number;
  mass: number;
  color: number;
  orbitalElements?: OrbitalElements;
  parent?: string;
  hasRing?: boolean;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
}

export interface BodyState {
  position: { x: number; y: number; z: number };
  velocity?: { x: number; y: number; z: number };
  trueAnomaly: number;
}

export type CameraMode = 'free' | 'follow' | 'sun';
export type ScaleMode = 'real' | 'exaggerated';
