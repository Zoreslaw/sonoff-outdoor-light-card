import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, SonoffOutdoorLightCardConfig } from './types';

@customElement('sonoff-outdoor-light-card')
export class SonoffOutdoorLightCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config?: SonoffOutdoorLightCardConfig;
  @state() private pending = false;
  private pendingTarget = false;
  @state() private serviceError = '';

  private gesture?: { id: number; startY: number };
  private suppressClick = false;
  private springFrame = 0;
  private compression = 0;
  private velocity = 0;
  private commandVersion = 0;

  public setConfig(config: SonoffOutdoorLightCardConfig): void {
    if (!config?.entity) throw new Error('Потрібно вказати сутність');
    if (typeof config.entity !== 'string' || !/^[a-z_]+\.[a-z0-9_]+$/.test(config.entity)) {
      throw new Error('Сутність повинна мати коректний entity_id');
    }
    if (config.name !== undefined && typeof config.name !== 'string') throw new Error('Назва має бути рядком');
    this.commandVersion++;
    this.pending = false;
    this.resetMotion();
    this.config = { ...config };
    this.serviceError = '';
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    await import('./editor');
    return document.createElement('sonoff-outdoor-light-card-editor');
  }

  public static getStubConfig(hass?: HomeAssistant): SonoffOutdoorLightCardConfig {
    return {
      type: 'custom:sonoff-outdoor-light-card',
      entity: Object.keys(hass?.states ?? {}).find((id) => id.startsWith('switch.')) ?? '',
    };
  }

  public getCardSize(): number {
    return 4;
  }

  protected render() {
    if (!this.config) return html``;
    if (!this.hass) return this.renderError('Очікування Home Assistant...');
    if (this.config.entity.split('.')[0] !== 'switch') {
      return this.renderError('Ця картка підтримує лише сутності switch');
    }
    const entity = this.hass.states[this.config.entity];
    if (!entity) return this.renderError(`Сутність не знайдено: ${this.config.entity}`);
    const isOn = entity.state === 'on';
    const available = isOn || entity.state === 'off';
    const name = this.config.name || entity.attributes.friendly_name || this.config.entity;
    return html`
      <ha-card class=${`${isOn ? 'is-on' : ''} ${available ? '' : 'unavailable'}`}>
        <div class="content">
          <h2>${name}</h2>
          <button
            type="button"
            class="lamp-control"
            role="switch"
            aria-checked=${isOn ? 'true' : 'false'}
            aria-label=${`${name}: увімкнути або вимкнути`}
            aria-describedby="control-help"
            aria-busy=${this.pending ? 'true' : 'false'}
            aria-disabled=${!available || this.pending ? 'true' : 'false'}
            ?disabled=${!available}
            @click=${this.onClick}
            @keydown=${this.onKeyDown}
            @pointerdown=${this.onPointerDown}
            @pointermove=${this.onPointerMove}
            @pointerup=${this.onPointerUp}
            @pointercancel=${this.cancelGesture}
            @lostpointercapture=${this.cancelGesture}
          >
            ${this.renderLamp()}
          </button>
          <div class="control-footer" id="control-help" role="status" aria-live="polite">
            ${
              this.pending
                ? html`<span class="pending-dot" aria-hidden="true"></span
                    >${this.pendingTarget ? 'Вмикаємо…' : 'Вимикаємо…'}`
                : !available
                  ? 'Немає зв’язку'
                  : html`Натисніть на ліхтар<span class="sr-only">. ${isOn ? 'Увімкнено' : 'Вимкнено'}</span>`
            }
          </div>
          ${this.serviceError ? html`<p class="error" role="alert">${this.serviceError}</p>` : ''}
        </div>
      </ha-card>
    `;
  }

  private renderLamp() {
    return html`<svg viewBox="0 0 240 260" fill="none" aria-hidden="true">
      <circle class="light-field" cx="120" cy="87" r="72" />
      <path class="lamp-stem" d="M100 114h40v114a5 5 0 0 1-5 5h-30a5 5 0 0 1-5-5z" />
      <g class="lamp-head">
        <rect class="lamp-outline" x="98" y="40" width="44" height="92" rx="7" />
        <path class="lamp-glass" d="M101 49h38v70h-38z" />
        <path class="touch-mark" d="M120 73v9m-5-6a8 8 0 1 0 10 0" />
        <path class="lamp-seam" d="M102 125h36" />
      </g>
      <path class="ground-line" d="M88 234h64" />
    </svg>`;
  }

  private onClick(event: MouseEvent): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      if (event.detail !== 0) return;
    }
    if (!this.canInteract()) return;
    if (event.detail === 0) {
      this.compression = 9;
      this.velocity = 0;
      this.animateSpring(0);
    }
    void this.toggle();
  }

  private canInteract(): boolean {
    const value = this.config && this.hass?.states[this.config.entity]?.state;
    return !this.pending && (value === 'on' || value === 'off');
  }

  private onKeyDown(event: KeyboardEvent): void {
    const targets: Record<string, boolean> = {
      ArrowRight: true,
      ArrowUp: true,
      End: true,
      ArrowLeft: false,
      ArrowDown: false,
      Home: false,
    };
    if (event.key in targets) {
      event.preventDefault();
      void this.toggle(targets[event.key]);
    }
  }

  private onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !event.isPrimary || !this.canInteract()) return;
    this.suppressClick = false;
    this.gesture = { id: event.pointerId, startY: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.animateSpring(8);
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.gesture || this.gesture.id !== event.pointerId) return;
    this.animateSpring(Math.max(2, Math.min(16, 8 + (event.clientY - this.gesture.startY) * 0.3)));
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.gesture || this.gesture.id !== event.pointerId) return;
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.suppressClick =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;
    this.gesture = undefined;
    this.animateSpring(0);
  }

  private cancelGesture(): void {
    if (!this.gesture) return;
    this.gesture = undefined;
    this.suppressClick = true;
    this.animateSpring(0);
  }

  private animateSpring(target: number): void {
    cancelAnimationFrame(this.springFrame);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.compression = 0;
      this.velocity = 0;
      this.style.setProperty('--press', '0px');
      return;
    }
    let previous = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.032);
      previous = now;
      // An underdamped spring preserves momentum when the target changes.
      this.velocity += ((target - this.compression) * 240 - this.velocity * 17) * dt;
      this.compression += this.velocity * dt;
      this.style.setProperty('--press', `${this.compression}px`);
      if (Math.abs(target - this.compression) > 0.01 || Math.abs(this.velocity) > 0.05) {
        this.springFrame = requestAnimationFrame(step);
      } else {
        this.style.setProperty('--press', `${target}px`);
        this.springFrame = 0;
      }
    };
    this.springFrame = requestAnimationFrame(step);
  }

  private resetMotion(): void {
    cancelAnimationFrame(this.springFrame);
    this.springFrame = 0;
    this.compression = 0;
    this.velocity = 0;
    this.gesture = undefined;
    this.suppressClick = false;
    this.style.setProperty('--press', '0px');
  }

  public disconnectedCallback(): void {
    this.resetMotion();
    super.disconnectedCallback();
  }

  private renderError(message: string) {
    return html`<ha-card><p class="content error" role="alert">${message}</p></ha-card>`;
  }

  private async toggle(target?: boolean): Promise<void> {
    if (!this.hass || !this.config || this.pending || !this.config.entity.startsWith('switch.')) return;
    const entity = this.hass.states[this.config.entity];
    if (!entity || (entity.state !== 'on' && entity.state !== 'off')) return;
    const turnOn = target ?? entity.state !== 'on';
    if (turnOn === (entity.state === 'on')) return;
    const version = this.commandVersion;
    this.pendingTarget = turnOn;
    this.pending = true;
    this.serviceError = '';
    try {
      await this.hass.callService('switch', turnOn ? 'turn_on' : 'turn_off', {
        entity_id: this.config.entity,
      });
    } catch (error) {
      if (version !== this.commandVersion) return;
      this.serviceError = `Не вдалося перемкнути освітлення: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      if (version === this.commandVersion) this.pending = false;
    }
  }

  static styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    ha-card {
      display: block;
      overflow: hidden;
      border-radius: var(--ha-card-border-radius, 24px);
      background: var(--ha-card-background, var(--card-background-color, #ffffff));
      color: var(--primary-text-color, #262a31);
      border: 1px solid var(--divider-color, #e3e5e8);
      box-shadow: var(--ha-card-box-shadow, none);
    }
    .content {
      padding: 24px 24px 16px;
      text-align: center;
    }
    h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 500;
      line-height: 1.4;
      letter-spacing: -0.3px;
      overflow-wrap: anywhere;
    }
    .lamp-control {
      display: block;
      width: 160px;
      max-width: 100%;
      height: 240px;
      margin: 8px auto 0;
      padding: 0;
      border: 0;
      border-radius: 32px;
      background: transparent;
      color: inherit;
      cursor: pointer;
      touch-action: pan-y;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    .lamp-control svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
      pointer-events: none;
    }
    .lamp-head {
      transform: translateY(var(--press, 0px));
    }
    .lamp-stem,
    .lamp-outline {
      fill: var(--secondary-text-color, #70757e);
    }
    .lamp-glass {
      fill: var(--secondary-background-color, #e9ebef);
      transition: fill 350ms ease;
    }
    .lamp-seam {
      stroke: var(--card-background-color, #ffffff);
      stroke-opacity: 0.3;
    }
    .touch-mark {
      stroke: var(--secondary-text-color, #70757e);
      stroke-width: 1.8;
      stroke-linecap: round;
      opacity: 0.7;
      transition: opacity 150ms ease;
    }
    .is-on .touch-mark {
      stroke: #795d28;
    }
    .ground-line {
      stroke: var(--divider-color, #e3e5e8);
      stroke-width: 2;
      stroke-linecap: round;
    }
    .light-field {
      fill: #f4cf72;
      opacity: 0;
      transform-origin: 120px 87px;
      transform: scale(0.65);
      transition:
        opacity 450ms ease,
        transform 650ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .is-on .light-field {
      opacity: 0.16;
      transform: scale(1);
    }
    .is-on .lamp-glass {
      fill: #ffe4a0;
    }
    @media (hover: hover) {
      .lamp-control:not([aria-disabled='true']):hover .lamp-outline {
        fill: var(--primary-text-color, #262a31);
      }
      .lamp-control:not([aria-disabled='true']):hover .touch-mark {
        opacity: 1;
        stroke-width: 2.4;
      }
    }
    .lamp-control:focus-visible {
      outline: 2px solid var(--primary-color, #c49b41);
      outline-offset: 4px;
    }
    .lamp-control[aria-disabled='true'] {
      cursor: default;
    }
    .lamp-control[aria-busy='true'] {
      cursor: progress;
    }
    .lamp-control[aria-busy='true'] .lamp-glass {
      animation: waiting 900ms ease-in-out infinite alternate;
    }
    .pending-dot {
      width: 10px;
      height: 10px;
      border: 2px solid var(--divider-color, #e3e5e8);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: sending 800ms linear infinite;
    }
    @keyframes sending {
      to {
        transform: rotate(360deg);
      }
    }
    .unavailable .lamp-control {
      opacity: 0.35;
    }
    .control-footer {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      min-height: 20px;
      color: var(--secondary-text-color, #70757e);
      font-size: 12px;
      line-height: 1.5;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    @keyframes waiting {
      to {
        opacity: 0.35;
      }
    }
    .error {
      color: var(--error-color, #ef9e97);
      font-size: 13px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    @media (prefers-reduced-motion: reduce) {
      .lamp-head {
        transform: none;
      }
      *,
      *::before,
      *::after {
        transition: none !important;
        animation: none !important;
      }
    }
  `;
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === 'sonoff-outdoor-light-card')) {
  window.customCards.push({
    type: 'sonoff-outdoor-light-card',
    name: 'Освітлення подвір’я Sonoff',
    description: 'Керування освітленням подвір’я через наявну сутність switch у Home Assistant.',
    preview: true,
  });
}
