import * as THREE from 'three';
import { OrbitalElements } from '../types';
import { getOrbitPoints, eclipticToThreeJs } from '../astro/coordinates';
import { getDistanceScale } from './scale';

export function createOrbitLine(
  elements: OrbitalElements,
  color: number = 0x444466,
  scaleMode: 'real' | 'exaggerated' = 'real',
  segments: number = 256
): THREE.Line {
  const distanceScale = getDistanceScale(scaleMode);
  const points = getOrbitPoints(elements, segments);

  const vertices = new Float32Array((segments + 1) * 3);

  for (let i = 0; i <= segments; i++) {
    const pos = eclipticToThreeJs(points[i]);
    vertices[i * 3] = pos.x * distanceScale;
    vertices[i * 3 + 1] = pos.y * distanceScale;
    vertices[i * 3 + 2] = pos.z * distanceScale;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
  });

  const line = new THREE.Line(geometry, material);
  return line;
}

export function updateOrbitLineScale(
  line: THREE.Line,
  elements: OrbitalElements,
  scaleMode: 'real' | 'exaggerated',
  segments: number = 256
): void {
  const distanceScale = getDistanceScale(scaleMode);
  const points = getOrbitPoints(elements, segments);

  const positions = line.geometry.attributes.position.array as Float32Array;

  for (let i = 0; i <= segments; i++) {
    const pos = eclipticToThreeJs(points[i]);
    positions[i * 3] = pos.x * distanceScale;
    positions[i * 3 + 1] = pos.y * distanceScale;
    positions[i * 3 + 2] = pos.z * distanceScale;
  }

  line.geometry.attributes.position.needsUpdate = true;
}
