import { BodyData, ScaleMode, CameraMode } from '../types';
import { formatDistance, formatSize } from '../scene/scale';
import { orbitalElementsToPosition } from '../astro/coordinates';
import { TimeController } from '../time/TimeController';

export interface UICallbacks {
  onPlayPause: () => void;
  onReverse: () => void;
  onSpeedChange: (speed: number) => void;
  onSpeedUp: () => void;
  onSpeedDown: () => void;
  onScaleModeChange: (mode: ScaleMode) => void;
  onCameraModeChange: (mode: CameraMode) => void;
  onFollowBody: (name: string) => void;
  onGotoJ2000: () => void;
  onGotoNow: () => void;
  onDateChange: (date: Date) => void;
}

export class UIManager {
  private container: HTMLElement;
  private callbacks: UICallbacks;
  private timeController: TimeController;

  private infoPanel!: HTMLElement;
  private controlPanel!: HTMLElement;
  private timeDisplay!: HTMLElement;
  private speedDisplay!: HTMLElement;
  private speedSlider!: HTMLInputElement;

  private selectedBody: BodyData | null = null;

  constructor(container: HTMLElement, callbacks: UICallbacks, timeController: TimeController) {
    this.container = container;
    this.callbacks = callbacks;
    this.timeController = timeController;

    this.createUI();
  }

  private createUI(): void {
    this.createControlPanel();
    this.createInfoPanel();
  }

  private createControlPanel(): void {
    this.controlPanel = document.createElement('div');
    this.controlPanel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(10, 15, 30, 0.9);
      color: white;
      padding: 16px;
      border-radius: 12px;
      font-size: 14px;
      min-width: 280px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(100, 150, 255, 0.2);
      backdrop-filter: blur(10px);
      z-index: 100;
    `;

    const title = document.createElement('div');
    title.style.cssText = 'font-size: 18px; font-weight: bold; margin-bottom: 12px; color: #6af;';
    title.textContent = '🌌 太阳系模拟器';
    this.controlPanel.appendChild(title);

    this.timeDisplay = document.createElement('div');
    this.timeDisplay.style.cssText = 'margin-bottom: 12px; font-family: monospace; font-size: 12px; color: #9cf;';
    this.controlPanel.appendChild(this.timeDisplay);

    this.controlPanel.appendChild(this.createTimeControls());
    this.controlPanel.appendChild(this.createSpeedControls());
    this.controlPanel.appendChild(this.createDateControls());
    this.controlPanel.appendChild(this.createViewControls());
    this.controlPanel.appendChild(this.createScaleControls());
    this.controlPanel.appendChild(this.createPlanetList());

    this.container.appendChild(this.controlPanel);
  }

  private createTimeControls(): HTMLElement {
    const section = this.createSection('时间控制');

    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px;';

    const reverseBtn = this.createButton('⏪ 倒退', () => this.callbacks.onReverse());
    const playPauseBtn = this.createButton('▶ 播放/暂停', () => this.callbacks.onPlayPause());

    buttonRow.appendChild(reverseBtn);
    buttonRow.appendChild(playPauseBtn);
    section.appendChild(buttonRow);

    return section;
  }

  private createSpeedControls(): HTMLElement {
    const section = this.createSection('速度控制');

    const speedRow = document.createElement('div');
    speedRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';

    const slowerBtn = this.createButton('◀ 慢', () => this.callbacks.onSpeedDown(), true);
    this.speedDisplay = document.createElement('span');
    this.speedDisplay.style.cssText = 'flex: 1; text-align: center; font-family: monospace; font-weight: bold; color: #fc6;';
    const fasterBtn = this.createButton('快 ▶', () => this.callbacks.onSpeedUp(), true);

    speedRow.appendChild(slowerBtn);
    speedRow.appendChild(this.speedDisplay);
    speedRow.appendChild(fasterBtn);
    section.appendChild(speedRow);

    const speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.min = '0';
    speedSlider.max = '4';
    speedSlider.step = '1';
    speedSlider.value = '0';
    speedSlider.style.cssText = 'width: 100%;';
    speedSlider.addEventListener('input', (e) => {
      const levels = [1, 10, 100, 1000, 10000];
      const idx = parseInt((e.target as HTMLInputElement).value);
      this.callbacks.onSpeedChange(levels[idx]);
    });
    this.speedSlider = speedSlider;
    section.appendChild(speedSlider);

    return section;
  }

  private createDateControls(): HTMLElement {
    const section = this.createSection('日期跳转');

    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px;';

    const j2000Btn = this.createButton('J2000 历元', () => this.callbacks.onGotoJ2000(), true);
    const nowBtn = this.createButton('当前时间', () => this.callbacks.onGotoNow(), true);

    buttonRow.appendChild(j2000Btn);
    buttonRow.appendChild(nowBtn);
    section.appendChild(buttonRow);

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.style.cssText = 'width: 100%; padding: 4px; background: #223; color: white; border: 1px solid #446; border-radius: 4px;';
    dateInput.addEventListener('change', (e) => {
      const dateStr = (e.target as HTMLInputElement).value;
      if (dateStr) {
        const date = new Date(dateStr + 'T00:00:00Z');
        this.callbacks.onDateChange(date);
      }
    });
    section.appendChild(dateInput);

    return section;
  }

  private createViewControls(): HTMLElement {
    const section = this.createSection('视图模式');

    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = 'display: flex; gap: 4px; margin-bottom: 8px;';

    const sunBtn = this.createToggleButton('太阳中心', 'sun', () => this.callbacks.onCameraModeChange('sun'));
    const followBtn = this.createToggleButton('跟随', 'follow', () => this.callbacks.onCameraModeChange('follow'));
    const freeBtn = this.createToggleButton('自由飞行', 'free', () => this.callbacks.onCameraModeChange('free'));

    buttonRow.appendChild(sunBtn);
    buttonRow.appendChild(followBtn);
    buttonRow.appendChild(freeBtn);
    section.appendChild(buttonRow);

    return section;
  }

  private createScaleControls(): HTMLElement {
    const section = this.createSection('显示比例');

    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = 'display: flex; gap: 4px;';

    const realBtn = this.createToggleButton('真实比例', 'real', () => this.callbacks.onScaleModeChange('real'));
    const exagBtn = this.createToggleButton('夸张比例', 'exaggerated', () => this.callbacks.onScaleModeChange('exaggerated'));

    buttonRow.appendChild(realBtn);
    buttonRow.appendChild(exagBtn);
    section.appendChild(buttonRow);

    return section;
  }

  private createPlanetList(): HTMLElement {
    const section = this.createSection('天体');

    const planets = [
      { name: 'Sun', label: '太阳' },
      { name: 'Mercury', label: '水星' },
      { name: 'Venus', label: '金星' },
      { name: 'Earth', label: '地球' },
      { name: 'Mars', label: '火星' },
      { name: 'Jupiter', label: '木星' },
      { name: 'Saturn', label: '土星' },
      { name: 'Uranus', label: '天王星' },
      { name: 'Neptune', label: '海王星' },
      { name: 'Moon', label: '月球' },
    ];

    const list = document.createElement('div');
    list.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; max-height: 120px; overflow-y: auto;';

    for (const planet of planets) {
      const btn = this.createButton(planet.label, () => {
        this.callbacks.onFollowBody(planet.name);
      }, true);
      list.appendChild(btn);
    }

    section.appendChild(list);
    return section;
  }

  private createSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(100, 150, 255, 0.15);';

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #88a; margin-bottom: 6px;';
    titleEl.textContent = title;
    section.appendChild(titleEl);

    return section;
  }

  private createButton(text: string, onClick: () => void, small: boolean = false): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      background: linear-gradient(180deg, #345 0%, #234 100%);
      color: white;
      border: 1px solid #567;
      border-radius: 6px;
      padding: ${small ? '4px 8px' : '8px 12px'};
      font-size: ${small ? '11px' : '13px'};
      cursor: pointer;
      transition: all 0.2s;
      flex: 1;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'linear-gradient(180deg, #456 0%, #345 100%)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'linear-gradient(180deg, #345 0%, #234 100%)';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  private createToggleButton(text: string, _id: string, onClick: () => void): HTMLButtonElement {
    const btn = this.createButton(text, onClick, true);
    btn.dataset.mode = _id;
    return btn;
  }

  private createInfoPanel(): void {
    this.infoPanel = document.createElement('div');
    this.infoPanel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(10, 15, 30, 0.9);
      color: white;
      padding: 16px;
      border-radius: 12px;
      font-size: 13px;
      width: 300px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(100, 150, 255, 0.2);
      backdrop-filter: blur(10px);
      display: none;
      z-index: 100;
    `;
    this.container.appendChild(this.infoPanel);
  }

  public showBodyInfo(body: BodyData, daysSinceJ2000: number): void {
    this.selectedBody = body;
    this.infoPanel.style.display = 'block';

    const pos = body.orbitalElements
      ? orbitalElementsToPosition(body.orbitalElements, daysSinceJ2000)
      : { x: 0, y: 0, z: 0 };

    const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);

    let html = '';
    html += `<div style="font-size: 20px; font-weight: bold; color: #6af; margin-bottom: 4px;">${body.nameCn}</div>`;
    html += `<div style="color: #889; font-size: 12px; margin-bottom: 12px;">${body.name}</div>`;

    html += this.createInfoRow('半径', formatSize(body.radius));
    html += this.createInfoRow('质量', this.formatMass(body.mass));

    if (body.orbitalElements) {
      html += `<div style="color: #88a; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 10px 0 6px 0;">轨道参数</div>`;
      html += this.createInfoRow('半长轴', formatDistance(body.orbitalElements.a));
      html += this.createInfoRow('偏心率', body.orbitalElements.e.toFixed(4));
      html += this.createInfoRow('轨道倾角', (body.orbitalElements.i * 180 / Math.PI).toFixed(2) + '°');
      html += this.createInfoRow('轨道周期', body.orbitalElements.period.toFixed(2) + ' 天');
      html += this.createInfoRow('当前距离', formatDistance(distance));
    }

    html += `<div style="color: #88a; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 10px 0 6px 0;">当前位置</div>`;
    html += this.createInfoRow('X', pos.x.toFixed(6) + ' AU');
    html += this.createInfoRow('Y', pos.y.toFixed(6) + ' AU');
    html += this.createInfoRow('Z', pos.z.toFixed(6) + ' AU');

    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = 'position: absolute; top: 12px; right: 12px; cursor: pointer; color: #889; font-size: 16px;';
    closeBtn.addEventListener('click', () => this.hideInfoPanel());

    this.infoPanel.innerHTML = html;
    this.infoPanel.appendChild(closeBtn);
  }

  private createInfoRow(label: string, value: string): string {
    return `
      <div style="display: flex; justify-content: space-between; padding: 3px 0;">
        <span style="color: #99b;">${label}</span>
        <span style="color: #eef; font-family: monospace;">${value}</span>
      </div>
    `;
  }

  private formatMass(kg: number): string {
    const exp = Math.floor(Math.log10(Math.abs(kg)));
    const mantissa = kg / Math.pow(10, exp);
    return mantissa.toFixed(3) + ' × 10^' + exp + ' kg';
  }

  public hideInfoPanel(): void {
    this.selectedBody = null;
    this.infoPanel.style.display = 'none';
  }

  public update(): void {
    const speed = this.timeController.getSpeed();
    const direction = this.timeController.getDirection();
    const isPaused = this.timeController.getIsPaused();

    let speedText = `${speed}×`;
    if (isPaused) {
      speedText = '⏸ 暂停';
    } else if (direction === 'backward') {
      speedText = '⏪ ' + speedText;
    } else {
      speedText = '▶ ' + speedText;
    }
    this.speedDisplay.textContent = speedText;

    const levels = [1, 10, 100, 1000, 10000];
    const speedIndex = levels.findIndex(s => s >= speed);
    this.speedSlider.value = String(speedIndex >= 0 ? speedIndex : 0);

    this.timeDisplay.textContent = this.timeController.getFormattedDate();

    if (this.selectedBody) {
      const days = this.timeController.getDaysSinceJ2000();
      this.showBodyInfo(this.selectedBody, days);
    }
  }

  public setActiveCameraMode(mode: CameraMode): void {
    const buttons = this.controlPanel.querySelectorAll('[data-mode]');
    buttons.forEach(btn => {
      const el = btn as HTMLButtonElement;
      if (el.dataset.mode === mode) {
        el.style.background = 'linear-gradient(180deg, #579 0%, #357 100%)';
        el.style.borderColor = '#6af';
      } else {
        el.style.background = 'linear-gradient(180deg, #345 0%, #234 100%)';
        el.style.borderColor = '#567';
      }
    });
  }

  public setActiveScaleMode(mode: ScaleMode): void {
    const buttons = this.controlPanel.querySelectorAll('[data-mode]');
    buttons.forEach(btn => {
      const el = btn as HTMLButtonElement;
      if (el.dataset.mode === mode) {
        el.style.background = 'linear-gradient(180deg, #579 0%, #357 100%)';
        el.style.borderColor = '#6af';
      } else {
        el.style.background = 'linear-gradient(180deg, #345 0%, #234 100%)';
        el.style.borderColor = '#567';
      }
    });
  }
}
