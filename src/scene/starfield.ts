import * as THREE from 'three';

export function createStarField(count: number = 5000, radius: number = 1000): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.8 + Math.random() * 0.2);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const colorChoice = Math.random();
    let rColor, gColor, bColor;
    if (colorChoice < 0.1) {
      rColor = 1.0;
      gColor = 0.8;
      bColor = 0.6;
    } else if (colorChoice < 0.2) {
      rColor = 0.8;
      gColor = 0.9;
      bColor = 1.0;
    } else {
      const brightness = 0.7 + Math.random() * 0.3;
      rColor = brightness;
      gColor = brightness;
      bColor = brightness;
    }

    colors[i * 3] = rColor;
    colors[i * 3 + 1] = gColor;
    colors[i * 3 + 2] = bColor;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}
