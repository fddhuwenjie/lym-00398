import { J2000_JD, getCurrentJD, formatJDDate, julianDateToDate, dateToJulianDate } from '../astro/time';

export type TimeDirection = 'forward' | 'backward' | 'paused';

const SPEED_LEVELS = [1, 10, 100, 1000, 10000];

export class TimeController {
  private currentJD: number;
  private speedMultiplier: number = 1;
  private direction: TimeDirection = 'forward';
  private isPaused: boolean = false;
  private lastUpdateTime: number = 0;
  private listeners: Set<(jd: number) => void> = new Set();

  constructor(startJD?: number) {
    this.currentJD = startJD ?? getCurrentJD();
    this.lastUpdateTime = performance.now();
  }

  public update(): void {
    if (this.isPaused) {
      this.lastUpdateTime = performance.now();
      return;
    }

    const now = performance.now();
    const deltaMs = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    const deltaDays = (deltaMs / 1000) * this.speedMultiplier / 86400;

    if (this.direction === 'forward') {
      this.currentJD += deltaDays;
    } else {
      this.currentJD -= deltaDays;
    }

    this.notifyListeners();
  }

  public getJD(): number {
    return this.currentJD;
  }

  public getDaysSinceJ2000(): number {
    return this.currentJD - J2000_JD;
  }

  public setJD(jd: number): void {
    this.currentJD = jd;
    this.notifyListeners();
  }

  public setDate(date: Date): void {
    this.currentJD = dateToJulianDate(date);
    this.notifyListeners();
  }

  public setSpeed(speed: number): void {
    this.speedMultiplier = Math.max(1, Math.min(10000, speed));
  }

  public getSpeed(): number {
    return this.speedMultiplier;
  }

  public getSpeedLevels(): number[] {
    return [...SPEED_LEVELS];
  }

  public increaseSpeed(): void {
    const currentIndex = SPEED_LEVELS.findIndex(s => s >= this.speedMultiplier);
    if (currentIndex < SPEED_LEVELS.length - 1) {
      this.speedMultiplier = SPEED_LEVELS[currentIndex + 1];
    } else {
      this.speedMultiplier = SPEED_LEVELS[SPEED_LEVELS.length - 1];
    }
  }

  public decreaseSpeed(): void {
    const currentIndex = SPEED_LEVELS.findIndex(s => s >= this.speedMultiplier);
    if (currentIndex > 0) {
      this.speedMultiplier = SPEED_LEVELS[currentIndex - 1];
    } else {
      this.speedMultiplier = SPEED_LEVELS[0];
    }
  }

  public play(): void {
    this.isPaused = false;
    this.direction = 'forward';
    this.lastUpdateTime = performance.now();
  }

  public pause(): void {
    this.isPaused = true;
  }

  public reverse(): void {
    this.isPaused = false;
    this.direction = 'backward';
    this.lastUpdateTime = performance.now();
  }

  public togglePlayPause(): void {
    if (this.isPaused) {
      this.play();
    } else {
      this.pause();
    }
  }

  public toggleDirection(): void {
    if (this.direction === 'forward') {
      this.direction = 'backward';
    } else {
      this.direction = 'forward';
    }
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getDirection(): TimeDirection {
    return this.direction;
  }

  public goToJ2000(): void {
    this.currentJD = J2000_JD;
    this.notifyListeners();
  }

  public goToNow(): void {
    this.currentJD = getCurrentJD();
    this.notifyListeners();
  }

  public getFormattedDate(): string {
    return formatJDDate(this.currentJD);
  }

  public getDate(): Date {
    return julianDateToDate(this.currentJD);
  }

  public onChange(callback: (jd: number) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.currentJD);
    }
  }
}
