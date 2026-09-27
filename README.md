# Sonoff Outdoor Light Card

A Home Assistant dashboard card built with TypeScript and Lit for outdoor lights controlled by an existing `switch` entity.

## Build

Node.js 22.13 or newer is recommended for compatibility with all development tools.

```sh
npm install
npm run build
```

Output: `dist/sonoff-outdoor-light-card.js`. All runtime dependencies are included in the bundle.

## Install through HACS

1. Open **HACS** in Home Assistant.
2. Open the top-right menu and select **Custom repositories**.
3. Enter `https://github.com/Zoreslaw/sonoff-outdoor-light-card` and select **Dashboard** as the type (called **Lovelace** in older versions).
4. Select **Add**, find **Sonoff Outdoor Light Card**, and download it.
5. Refresh the browser and add **Sonoff Outdoor Light Card** to your dashboard.
6. In the visual editor, select your existing switch entity and optionally enter a name.

If you previously registered `/local/sonoff-outdoor-light-card.js` manually, remove that resource before using the HACS copy to avoid loading the card twice. You can leave the old file on disk.

For dashboards managed through the UI, HACS normally registers the resource automatically. If it is missing, add `/hacsfiles/sonoff-outdoor-light-card/sonoff-outdoor-light-card.js` as a **JavaScript Module** under **Settings > Dashboards > Resources**. YAML-managed dashboards require the resource to be configured in YAML.

### YAML card configuration

```yaml
type: custom:sonoff-outdoor-light-card
entity: switch.example
name: Outdoor lights
```

Replace `switch.example` with your actual entity_id from **Developer tools > States**. The device must already be integrated into Home Assistant; this card controls its switch entity.

## Manual installation in Home Assistant

1. Copy `dist/sonoff-outdoor-light-card.js` to `/config/www/sonoff-outdoor-light-card.js`.
2. Add `/local/sonoff-outdoor-light-card.js` to Dashboard Resources as a **JavaScript Module**.
3. Add the card:

```yaml
type: custom:sonoff-outdoor-light-card
entity: switch.example
name: Outdoor lights
```

If you have just created the `www` directory, restart Home Assistant. After replacing the bundle, refresh the page. If needed, add a version query to the resource URL, such as `?v=2`, to refresh the cached resource.

## Configuration and behavior

- `entity`: required entity_id of an existing switch entity.
- `name`: optional display name. Defaults to the entity's friendly_name, then its entity_id.
- The card displays the name, ON/OFF state, entity_id, and a large toggle button.
- ON calls `switch.turn_off`; OFF calls `switch.turn_on`.
- State updates through the reactive `hass` property.
- For unavailable/unknown states, the button is disabled and the current state is displayed.
- Missing entities and unsupported domains display an error inside ha-card.
- Service call failures display an error inside the card.

The card appears in the picker as **Sonoff Outdoor Light Card**. The visual editor provides a switch selector and an optional name field. The initial configuration selects the first existing switch entity. If no switch exists, create one in Home Assistant first.

The card communicates only through Home Assistant. It does not use the Sonoff API, eWeLink, MQTT, or direct device protocols.

## Development

```sh
npm start
npm test
```

Run `npm run build` before running tests. The development bundle is available at `http://localhost:5000/sonoff-outdoor-light-card.js`.
Tests exercise the built module using a DOM environment and a simulated hass instance.

[Home Assistant custom card API documentation](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/).

## Repository and releases

Repository: [Zoreslaw/sonoff-outdoor-light-card](https://github.com/Zoreslaw/sonoff-outdoor-light-card).

To publish a new version, update the version in package.json and package-lock.json, commit the changes, then push a matching tag such as `v1.0.0`. GitHub Actions validate the version, build and test the card, and publish a release with `sonoff-outdoor-light-card.js` attached. HACS uses `hacs.json` and this release asset.

## License

MIT; see LICENSE. Existing copyright notices are preserved.
