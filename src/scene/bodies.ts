import * as THREE from 'three';
import { BodyData, ScaleMode } from '../types';
import { getSizeScale, getBaseSizeScale } from './scale';

export function createSun(data: BodyData, scaleMode: ScaleMode): THREE.Mesh {
  const sizeScale = getSizeScale(scaleMode);
  const radius = data.radius * sizeScale;

  const geometry = new THREE.SphereGeometry(radius, 64, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffdd44,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = data.name;
  mesh.userData.bodyData = data;

  const glowColors = [0xffff88, 0xffcc44, 0xff9922];
  const glowSizes = [1.5, 2.0, 2.8];
  const glowOpacities = [0.4, 0.2, 0.1];

  for (let i = 0; i < 3; i++) {
    const glowGeometry = new THREE.SphereGeometry(radius * glowSizes[i], 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: glowColors[i],
      transparent: true,
      opacity: glowOpacities[i],
      side: THREE.BackSide,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);
  }

  return mesh;
}

export function createPlanet(data: BodyData, scaleMode: ScaleMode): THREE.Mesh {
  const sizeScale = getSizeScale(scaleMode);
  const radius = data.radius * sizeScale;

  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: data.color,
    roughness: 0.8,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = data.name;
  mesh.userData.bodyData = data;

  return mesh;
}

export function createMoon(data: BodyData, scaleMode: ScaleMode): THREE.Mesh {
  const sizeScale = getBaseSizeScale(scaleMode);
  const radius = data.radius * sizeScale;

  const geometry = new THREE.SphereGeometry(radius, 24, 24);
  const material = new THREE.MeshStandardMaterial({
    color: data.color,
    roughness: 0.9,
    metalness: 0.0,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = data.name;
  mesh.userData.bodyData = data;

  return mesh;
}

export function createSaturnRings(
  data: BodyData,
  scaleMode: ScaleMode
): THREE.Mesh | null {
  if (!data.hasRing || !data.ringInnerRadius || !data.ringOuterRadius) {
    return null;
  }

  const sizeScale = getSizeScale(scaleMode);
  const innerRadius = data.ringInnerRadius * sizeScale;
  const outerRadius = data.ringOuterRadius * sizeScale;

  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
  const material = new THREE.MeshStandardMaterial({
    color: 0xd4c4a0,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });

  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = Math.PI / 2;
  ring.name = `${data.name}Ring`;

  return ring;
}

export function updatePlanetScale(
  mesh: THREE.Mesh,
  data: BodyData,
  scaleMode: ScaleMode
): void {
  const sizeScale = getSizeScale(scaleMode);
  const radius = data.radius * sizeScale;
  mesh.scale.setScalar(radius / (mesh.geometry as THREE.SphereGeometry).parameters.radius);
}
