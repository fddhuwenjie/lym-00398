import { ScaleMode } from '../types';

export const AU = 149597870.7;

export const UNITS_PER_AU = 3.0;

export const SCALE_CONFIG = {
  real: {
    unitsPerAu: UNITS_PER_AU,
    sizeMultiplier: 1.0,
  },
  exaggerated: {
    unitsPerAu: UNITS_PER_AU,
    sizeMultiplier: 100.0,
  },
};

export function getDistanceScale(mode: ScaleMode): number {
  return SCALE_CONFIG[mode].unitsPerAu;
}

export function getSizeScale(mode: ScaleMode): number {
  const kmPerAu = AU;
  const unitsPerKm = SCALE_CONFIG[mode].unitsPerAu / kmPerAu;
  return unitsPerKm * SCALE_CONFIG[mode].sizeMultiplier;
}

export function getBaseSizeScale(mode: ScaleMode): number {
  const kmPerAu = AU;
  return SCALE_CONFIG[mode].unitsPerAu / kmPerAu;
}

export function kmToAu(km: number): number {
  return km / AU;
}

export function auToKm(au: number): number {
  return au * AU;
}

export function formatDistance(au: number): string {
  if (Math.abs(au) >= 1) {
    return `${au.toFixed(3)} AU`;
  }
  return `${(au * AU).toFixed(0)} km`;
}

export function formatSize(km: number): string {
  if (km >= 10000) {
    return `${(km / 1000).toFixed(1)} × 10³ km`;
  }
  return `${km.toFixed(0)} km`;
}
