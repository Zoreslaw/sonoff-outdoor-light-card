import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';

const browser = new Window();
for (const key of [
  'window',
  'document',
  'customElements',
  'HTMLElement',
  'Element',
  'Document',
  'DocumentFragment',
  'ShadowRoot',
  'CSSStyleSheet',
  'CustomEvent',
  'Event',
  'Node',
]) {
  globalThis[key] = key === 'window' ? browser : browser[key];
}
await import('../dist/sonoff-outdoor-light-card.js');
const Card = customElements.get('sonoff-outdoor-light-card');
const config = { type: 'custom:sonoff-outdoor-light-card', entity: 'switch.test_lights' };
const calls = [];
function hass(state = 'off') {
  return {
    states: { [config.entity]: { state, attributes: { friendly_name: 'Garden' } } },
    callService: async (...args) => {
      calls.push(args);
    },
  };
}
async function card(state = 'off', overrides = {}) {
  const el = new Card();
  el.setConfig({ ...config, ...overrides });
  el.hass = hass(state);
  document.body.append(el);
  await el.updateComplete;
  return el;
}

test('configuration validation', () => {
  const el = new Card();
  assert.throws(() => el.setConfig({}), /Entity is required/);
  assert.throws(() => el.setConfig({ entity: 123 }), /valid entity_id/);
  assert.throws(() => el.setConfig({ ...config, name: 123 }), /Name must be a string/);
});

test('renders name, state, entity and reacts to hass/config changes', async () => {
  const el = await card();
  assert.equal(el.shadowRoot.querySelector('h2').textContent, 'Garden');
  assert.equal(el.shadowRoot.querySelector('.status').textContent, 'OFF');
  assert.equal(el.shadowRoot.querySelector('.entity-id').textContent, config.entity);
  el.hass = hass('on');
  await el.updateComplete;
  assert.equal(el.shadowRoot.querySelector('.status').textContent, 'ON');
  el.setConfig({ ...config, name: 'Outdoor lights' });
  await el.updateComplete;
  assert.equal(el.shadowRoot.querySelector('h2').textContent, 'Outdoor lights');
  el.hass = { ...hass(), states: { [config.entity]: { state: 'off', attributes: {} } } };
  el.setConfig(config);
  await el.updateComplete;
  assert.equal(el.shadowRoot.querySelector('h2').textContent, config.entity);
  el.remove();
});

test('toggle calls the correct switch service and waits for hass state', async () => {
  for (const [state, service] of [
    ['off', 'turn_on'],
    ['on', 'turn_off'],
  ]) {
    const el = await card(state);
    calls.length = 0;
    el.shadowRoot.querySelector('button').click();
    await el.updateComplete;
    assert.deepEqual(calls, [['switch', service, { entity_id: config.entity }]]);
    assert.equal(el.shadowRoot.querySelector('.status').textContent, state.toUpperCase());
    el.remove();
  }
});

test('missing entity, wrong domain and loading produce readable errors', async () => {
  const el = await card();
  el.hass = { ...hass(), states: {} };
  await el.updateComplete;
  assert.match(el.shadowRoot.textContent, /Entity not found: switch.test_lights/);
  assert.equal(el.shadowRoot.querySelector('button'), null);
  el.setConfig({ ...config, entity: 'light.garden' });
  await el.updateComplete;
  assert.match(el.shadowRoot.textContent, /This card supports switch entities only/);
  el.hass = undefined;
  await el.updateComplete;
  assert.match(el.shadowRoot.textContent, /Waiting for Home Assistant/);
  el.remove();
});

test('unavailable and unknown states cannot call services', async () => {
  for (const state of ['unknown', 'unavailable']) {
    const el = await card(state);
    calls.length = 0;
    assert.equal(el.shadowRoot.querySelector('button').disabled, true);
    el.shadowRoot.querySelector('button').click();
    await el.updateComplete;
    assert.deepEqual(calls, []);
    assert.equal(el.shadowRoot.querySelector('.status').textContent, state.toUpperCase());
    el.remove();
  }
});

test('pending requests block duplicate clicks and failed calls show an error', async () => {
  const el = await card();
  let reject;
  calls.length = 0;
  el.hass = {
    ...hass(),
    callService: (...args) => {
      calls.push(args);
      return new Promise((_, fail) => {
        reject = fail;
      });
    },
  };
  await el.updateComplete;
  const button = el.shadowRoot.querySelector('button');
  button.click();
  button.click();
  await el.updateComplete;
  assert.equal(calls.length, 1);
  assert.equal(button.disabled, true);
  reject(new Error('Connection failed'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
  assert.match(el.shadowRoot.textContent, /Unable to toggle lights: Connection failed/);
  assert.equal(button.disabled, false);
  el.remove();
});

test('picker, stub config and visual editor integrate with Home Assistant', async () => {
  assert.equal(
    window.customCards.find((entry) => entry.type === 'sonoff-outdoor-light-card').name,
    'Sonoff Outdoor Light Card',
  );
  assert.equal(Card.getStubConfig(hass()).entity, config.entity);
  assert.equal(Card.getStubConfig({ states: {} }).entity, '');
  const editor = await Card.getConfigElement();
  editor.hass = { ...hass(), states: { ...hass().states, 'light.other': { state: 'on', attributes: {} } } };
  editor.setConfig(config);
  document.body.append(editor);
  await editor.updateComplete;
  assert.equal(editor.shadowRoot.querySelectorAll('option').length, 2);
  let changed;
  editor.addEventListener('config-changed', (event) => {
    changed = event.detail.config;
  });
  const input = editor.shadowRoot.querySelector('input');
  input.value = 'Patio';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  assert.equal(changed.name, 'Patio');
  assert.equal(changed.entity, config.entity);
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  assert.equal('name' in changed, false);
  editor.remove();
});
