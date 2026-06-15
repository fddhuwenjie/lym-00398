import * as THREE from 'three';
import { Vector3, eclipticToThreeJs } from '../astro/coordinates';
import { getDistanceScale } from './scale';
import { ScaleMode } from '../types';

export function createTrajectoryLine(
  points: Vector3[],
  color: number,
  scaleMode: ScaleMode
): THREE.Line {
  const distanceScale = getDistanceScale(scaleMode);
  const positions = new Float32Array(points.length * 3);

  for (let i = 0; i < points.length; i++) {
    const pos = eclipticToThreeJs(points[i]);
    positions[i * 3] = pos.x * distanceScale;
    positions[i * 3 + 1] = pos.y * distanceScale;
    positions[i * 3 + 2] = pos.z * distanceScale;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineDashedMaterial({
    color,
    dashSize: 0.15,
    gapSize: 0.1,
    transparent: true,
    opacity: 0.7,
  });

  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}

export function updateTrajectoryLine(
  line: THREE.Line,
  points: Vector3[],
  scaleMode: ScaleMode
): void {
  const distanceScale = getDistanceScale(scaleMode);

  const positions = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    const pos = eclipticToThreeJs(points[i]);
    positions[i * 3] = pos.x * distanceScale;
    positions[i * 3 + 1] = pos.y * distanceScale;
    positions[i * 3 + 2] = pos.z * distanceScale;
  }

  line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  line.geometry.attributes.position.needsUpdate = true;
  line.computeLineDistances();
}
