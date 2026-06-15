import * as THREE from 'three';
import { CameraMode } from '../types';
import { SolarSystem } from '../scene/SolarSystem';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraMode = 'free';
  public targetBody: string = 'Sun';

  private solarSystem: SolarSystem;
  private domElement: HTMLElement;

  private isDragging: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };

  private yaw: number = 0;
  private pitch: number = 0;

  private distance: number = 10;
  private keys: Set<string> = new Set();
  private followLerpFactor: number = 0.05;

  private freePosition: THREE.Vector3 = new THREE.Vector3(0, 5, 20);
  private freeYaw: number = 0;
  private freePitch: number = -0.2;
  private freeMoveSpeed: number = 0.5;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, solarSystem: SolarSystem) {
    this.camera = camera;
    this.domElement = domElement;
    this.solarSystem = solarSystem;

    this.setupEventListeners();
    this.setMode('sun');
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this));
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0 || e.button === 2) {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMousePosition.x;
    const deltaY = e.clientY - this.previousMousePosition.y;

    this.previousMousePosition = { x: e.clientX, y: e.clientY };

    if (this.mode === 'free') {
      this.freeYaw -= deltaX * 0.002;
      this.freePitch -= deltaY * 0.002;
      this.freePitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.freePitch));
    } else {
      this.yaw -= deltaX * 0.005;
      this.pitch -= deltaY * 0.005;
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    if (this.mode === 'free') {
      this.freeMoveSpeed *= e.deltaY > 0 ? 0.9 : 1.1;
      this.freeMoveSpeed = Math.max(0.01, Math.min(100, this.freeMoveSpeed));
    } else {
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      this.distance *= zoomFactor;
      this.distance = Math.max(0.1, Math.min(5000, this.distance));
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key.toLowerCase());
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  public update(deltaTime: number): void {
    if (this.mode === 'free') {
      this.updateFreeMode(deltaTime);
    } else if (this.mode === 'follow') {
      this.updateFollowMode();
    } else if (this.mode === 'sun') {
      this.updateSunMode();
    }
  }

  private updateFreeMode(deltaTime: number): void {
    const forward = new THREE.Vector3(
      -Math.sin(this.freeYaw) * Math.cos(this.freePitch),
      Math.sin(this.freePitch),
      -Math.cos(this.freeYaw) * Math.cos(this.freePitch)
    );

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const speed = this.freeMoveSpeed * deltaTime * 60;

    if (this.keys.has('w')) {
      this.freePosition.add(forward.clone().multiplyScalar(speed));
    }
    if (this.keys.has('s')) {
      this.freePosition.add(forward.clone().multiplyScalar(-speed));
    }
    if (this.keys.has('a')) {
      this.freePosition.add(right.clone().multiplyScalar(-speed));
    }
    if (this.keys.has('d')) {
      this.freePosition.add(right.clone().multiplyScalar(speed));
    }
    if (this.keys.has(' ')) {
      this.freePosition.y += speed;
    }
    if (this.keys.has('shift')) {
      this.freePosition.y -= speed;
    }

    this.camera.position.copy(this.freePosition);

    const lookTarget = this.freePosition.clone().add(forward);
    this.camera.lookAt(lookTarget);
  }

  private updateFollowMode(): void {
    const targetPos = this.solarSystem.getBodyPosition(this.targetBody);
    if (!targetPos) return;

    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance,
      Math.sin(this.pitch) * this.distance,
      Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance
    );

    const desiredPosition = targetPos.clone().add(offset);

    this.camera.position.lerp(desiredPosition, this.followLerpFactor);
    this.camera.lookAt(targetPos);
  }

  private updateSunMode(): void {
    const sunPos = this.solarSystem.getBodyPosition('Sun');
    if (!sunPos) return;

    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance,
      Math.sin(this.pitch) * this.distance,
      Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance
    );

    const desiredPosition = sunPos.clone().add(offset);

    this.camera.position.copy(desiredPosition);
    this.camera.lookAt(sunPos);
  }

  public setMode(mode: CameraMode): void {
    if (this.mode === mode) return;

    this.mode = mode;

    if (mode === 'sun') {
      this.targetBody = 'Sun';
      this.distance = 40;
      this.yaw = 0;
      this.pitch = 0.3;
    } else if (mode === 'follow') {
      this.distance = 5;
      this.yaw = 0;
      this.pitch = 0.2;
    } else if (mode === 'free') {
      const currentPos = this.camera.position.clone();
      this.freePosition.copy(currentPos);
      this.freeYaw = Math.atan2(-currentPos.x, -currentPos.z);
      this.freePitch = Math.asin(currentPos.y / currentPos.length());
    }
  }

  public setTargetBody(bodyName: string): void {
    this.targetBody = bodyName;

    if (this.mode !== 'follow') {
      this.setMode('follow');
    }

    const body = this.solarSystem.bodies.get(bodyName);
    if (!body) return;

    const geometry = body.mesh.geometry as THREE.SphereGeometry;
    const localRadius = geometry.parameters?.radius || 1;
    const worldScale = new THREE.Vector3();
    body.mesh.getWorldScale(worldScale);
    const worldRadius = localRadius * worldScale.x;

    if (body.data.type === 'moon') {
      const parentBody = body.data.parent
        ? this.solarSystem.bodies.get(body.data.parent)
        : null;

      let distance: number;
      if (parentBody) {
        const parentWorldScale = new THREE.Vector3();
        parentBody.mesh.getWorldScale(parentWorldScale);
        const parentGeometry = parentBody.mesh.geometry as THREE.SphereGeometry;
        const parentLocalRadius = parentGeometry.parameters?.radius || 1;
        const parentWorldRadius = parentLocalRadius * parentWorldScale.x;
        distance = Math.max(parentWorldRadius * 5, worldRadius * 15);
      } else {
        distance = worldRadius * 10;
      }
      this.distance = Math.max(distance, 1);
    } else {
      this.distance = Math.max(worldRadius * 8, 3);
    }
  }

  public reset(): void {
    this.setMode('sun');
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
