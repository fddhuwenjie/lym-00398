import * as THREE from 'three';
import { SolarSystem } from './scene/SolarSystem';
import { TimeController } from './time/TimeController';
import { CameraController } from './camera/CameraController';
import { UIManager } from './ui/UIManager';
import { ScaleMode, CameraMode } from './types';

class SolarSystemApp {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private solarSystem!: SolarSystem;
  private timeController!: TimeController;
  private cameraController!: CameraController;
  private uiManager!: UIManager;
  private camera!: THREE.PerspectiveCamera;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private clock: THREE.Clock = new THREE.Clock();
  private animationId: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private init(): void {
    this.createRenderer();
    this.createCamera();
    this.createSolarSystem();
    this.createTimeController();
    this.createCameraController();
    this.createUI();
    this.setupEventListeners();

    this.solarSystem.update(this.timeController.getDaysSinceJ2000());

    this.animate();
  }

  private createRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);
  }

  private createCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.001,
      2000
    );
    this.camera.position.set(0, 10, 30);
  }

  private createSolarSystem(): void {
    this.solarSystem = new SolarSystem();
    this.solarSystem.init();
  }

  private createTimeController(): void {
    this.timeController = new TimeController();
  }

  private createCameraController(): void {
    this.cameraController = new CameraController(
      this.camera,
      this.renderer.domElement,
      this.solarSystem
    );
  }

  private createUI(): void {
    this.uiManager = new UIManager(
      this.container,
      {
        onPlayPause: () => this.timeController.togglePlayPause(),
        onReverse: () => {
          if (this.timeController.getDirection() === 'backward') {
            this.timeController.play();
          } else {
            this.timeController.reverse();
          }
        },
        onSpeedChange: (speed) => this.timeController.setSpeed(speed),
        onSpeedUp: () => this.timeController.increaseSpeed(),
        onSpeedDown: () => this.timeController.decreaseSpeed(),
        onScaleModeChange: (mode: ScaleMode) => {
          this.solarSystem.setScaleMode(mode);
          this.uiManager.setActiveScaleMode(mode);
          this.solarSystem.update(this.timeController.getDaysSinceJ2000());
        },
        onCameraModeChange: (mode: CameraMode) => {
          this.cameraController.setMode(mode);
          this.uiManager.setActiveCameraMode(mode);
        },
        onFollowBody: (name: string) => {
          this.cameraController.setTargetBody(name);
          this.uiManager.setActiveCameraMode('follow');
          const body = this.solarSystem.bodies.get(name);
          if (body) {
            this.uiManager.showBodyInfo(body.data, this.timeController.getDaysSinceJ2000());
          }
        },
        onGotoJ2000: () => this.timeController.goToJ2000(),
        onGotoNow: () => this.timeController.goToNow(),
        onDateChange: (date: Date) => this.timeController.setDate(date),
      },
      this.timeController
    );

    this.uiManager.setActiveCameraMode('sun');
    this.uiManager.setActiveScaleMode('exaggerated');
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.addEventListener('click', this.onCanvasClick.bind(this));

    window.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        this.timeController.togglePlayPause();
      }
      if (e.key === 'ArrowRight') {
        this.timeController.increaseSpeed();
      }
      if (e.key === 'ArrowLeft') {
        this.timeController.decreaseSpeed();
      }
      if (e.key === 'r' || e.key === 'R') {
        if (this.timeController.getDirection() === 'backward') {
          this.timeController.play();
        } else {
          this.timeController.reverse();
        }
      }
    });
  }

  private onCanvasClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const clickables = this.solarSystem.getClickableObjects();
    const intersects = this.raycaster.intersectObjects(clickables, true);

    if (intersects.length > 0) {
      let clicked = intersects[0].object;
      while (clicked.parent && !clicked.userData.bodyData) {
        clicked = clicked.parent;
      }

      const bodyData = this.solarSystem.getBodyByMesh(clicked);
      if (bodyData) {
        this.cameraController.setTargetBody(bodyData.name);
        this.uiManager.setActiveCameraMode('follow');
        this.uiManager.showBodyInfo(bodyData, this.timeController.getDaysSinceJ2000());
      }
    } else {
      this.uiManager.hideInfoPanel();
    }
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.renderer.setSize(width, height);
    this.cameraController.resize(width, height);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    this.timeController.update();

    this.solarSystem.update(this.timeController.getDaysSinceJ2000());

    this.cameraController.update(delta);

    this.uiManager.update();

    this.renderer.render(this.solarSystem.scene, this.camera);
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
  }
}

const container = document.getElementById('app');
if (container) {
  new SolarSystemApp(container);
}
