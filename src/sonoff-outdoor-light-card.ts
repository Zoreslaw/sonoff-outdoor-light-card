import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, SonoffOutdoorLightCardConfig } from './types';

@customElement('sonoff-outdoor-light-card')
export class SonoffOutdoorLightCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config?: SonoffOutdoorLightCardConfig;
  @state() private pending = false;
  @state() private serviceError = '';

  public setConfig(config: SonoffOutdoorLightCardConfig): void {
    if (!config?.entity) throw new Error('Entity is required');
    if (typeof config.entity !== 'string' || !/^[a-z_]+\.[a-z0-9_]+$/.test(config.entity)) {
      throw new Error('Entity must be a valid entity_id');
    }
    if (config.name !== undefined && typeof config.name !== 'string') throw new Error('Name must be a string');
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
    if (!this.hass) return this.renderError('Waiting for Home Assistant...');
    if (this.config.entity.split('.')[0] !== 'switch') {
      return this.renderError('This card supports switch entities only');
    }
    const entity = this.hass.states[this.config.entity];
    if (!entity) return this.renderError(`Entity not found: ${this.config.entity}`);
    const isOn = entity.state === 'on';
    const available = isOn || entity.state === 'off';
    const name = this.config.name || entity.attributes.friendly_name || this.config.entity;
    return html`
      <ha-card>
        <div class="content">
          <h2>${name}</h2>
          <div class="status" aria-live="polite">${entity.state.toUpperCase()}</div>
          <div class="entity-id">${this.config.entity}</div>
          <button
            type="button"
            class=${isOn ? 'on' : ''}
            ?disabled=${!available || this.pending}
            aria-label=${`${isOn ? 'Turn off' : 'Turn on'} ${name}`}
            @click=${this.toggle}
          >
            ${this.pending ? 'Sending...' : available ? (isOn ? 'Turn off' : 'Turn on') : 'Unavailable'}
          </button>
          ${this.serviceError ? html`<p class="error" role="alert">${this.serviceError}</p>` : ''}
        </div>
      </ha-card>
    `;
  }

  private renderError(message: string) {
    return html`<ha-card><p class="content error" role="alert">${message}</p></ha-card>`;
  }

  private async toggle(): Promise<void> {
    if (!this.hass || !this.config || this.pending || !this.config.entity.startsWith('switch.')) return;
    const entity = this.hass.states[this.config.entity];
    if (!entity || (entity.state !== 'on' && entity.state !== 'off')) return;
    this.pending = true;
    this.serviceError = '';
    try {
      await this.hass.callService('switch', entity.state === 'on' ? 'turn_off' : 'turn_on', {
        entity_id: this.config.entity,
      });
    } catch (error) {
      this.serviceError = `Unable to toggle lights: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.pending = false;
    }
  }

  static styles = css`
    :host {
      display: block;
    }
    .content {
      padding: 24px;
    }
    h2 {
      margin: 0 0 16px;
      font-size: 20px;
      color: var(--primary-text-color);
      overflow-wrap: anywhere;
    }
    .status {
      font-size: 28px;
      font-weight: 600;
      color: var(--primary-text-color);
    }
    .entity-id {
      margin: 6px 0 24px;
      font-size: 12px;
      color: var(--secondary-text-color);
      overflow-wrap: anywhere;
    }
    button {
      width: 100%;
      min-height: 64px;
      padding: 16px;
      border: 0;
      border-radius: 12px;
      background: var(--primary-color);
      color: var(--text-primary-color, white);
      font: inherit;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
    }
    button.on {
      background: var(--state-switch-active-color, var(--primary-color));
    }
    button:focus-visible {
      outline: 3px solid var(--primary-text-color);
      outline-offset: 3px;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .error {
      color: var(--error-color);
      overflow-wrap: anywhere;
    }
  `;
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === 'sonoff-outdoor-light-card')) {
  window.customCards.push({
    type: 'sonoff-outdoor-light-card',
    name: 'Sonoff Outdoor Light Card',
    description: 'Control outdoor lights through an existing Home Assistant switch entity.',
    preview: true,
  });
}
