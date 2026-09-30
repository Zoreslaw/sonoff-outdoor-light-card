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
5. Refresh the browser and add **Освітлення подвір’я Sonoff** to your dashboard.
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

### Updating through HACS

Open the card repository in HACS and install the available update, then reload the dashboard in each browser or Home Assistant Companion App. Existing card configuration and the resource URL stay the same. If the old UI remains visible, clear the frontend cache and reload.

HACS installs the `sonoff-outdoor-light-card.js` asset from the GitHub release; there is no need to copy files manually or restart Home Assistant for a card update.

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
- The card displays a name and an interactive vector lamp. Press the lamp to toggle it; its head compresses and returns with a damped spring animation. Dragging adjusts the compression; releasing outside or cancelling the gesture sends no command.
- Enter/Space activate the focused lamp; arrow keys and Home/End select an explicit state. Reduced-motion preferences disable the animation.
- ON calls `switch.turn_off`; OFF calls `switch.turn_on`.
- State updates through the reactive `hass` property.
- For unavailable/unknown states, the lamp is disabled and a connection status is displayed. Routine state announcements are available to screen readers without permanent visual labels.
- Missing entities and unsupported domains display an error inside ha-card.
- Service call failures display an error inside the card.

The card UI is in Ukrainian and appears in the picker as **Освітлення подвір’я Sonoff**. User-provided names and entity friendly names are displayed as configured. The visual editor provides a switch selector and an optional name field. The initial configuration selects the first existing switch entity. If no switch exists, create one in Home Assistant first.

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

Version `2.0.0` is prepared in `package.json` and `package-lock.json`. After committing the changes, publish it with:

```sh
git push origin main
git tag v2.0.0
git push origin v2.0.0
```

The branch push runs the build checks. The tag push validates that the tag and both package files have matching versions, builds and tests the card, and publishes a GitHub release with `sonoff-outdoor-light-card.js` attached. HACS uses `hacs.json` and this release asset. No npm publication or additional GitHub secret is required; the release workflow uses the repository's `GITHUB_TOKEN` with `contents: write` permission.

For subsequent releases, run `npm version minor --no-git-tag-version` (or `patch` for a fix), commit both package files with your changes, and push a tag matching the new version. You can also publish a matching tag through GitHub's Releases page; the workflow will build and attach the bundle to that release. A tag must point to the commit containing its matching package version. Re-running the workflow uploads the asset to an existing release instead of trying to create it again.

## License

MIT; see LICENSE. Existing copyright notices are preserved.

## Night yard control

The original SVG yard scene fades in warm lamp and ground lighting only when Home Assistant reports `on`. No external images, fonts, or network assets are required.

- Tap or click the power switch to toggle. Drag the thumb to either endpoint to select OFF or ON; this does not control brightness.
- Focus the switch and press Space or Enter to toggle. Arrow Right/Up or End selects ON; Arrow Left/Down or Home selects OFF.
- A separate sending indicator appears while the service request is in flight. The scene and accessible switch state continue to reflect `hass.states`; successful service completion alone does not illuminate the lamp.
- Unavailable and unknown states disable the control. Service failures are announced with an inline error and allow retrying.
- Motion is disabled when the operating system requests reduced motion. The card uses Home Assistant theme colors for its content and a fixed nighttime palette for the illustration and physical control.

For a standalone preview, build the card, serve the repository root (for example, `python -m http.server 8765`), and open `http://localhost:8765/examples/preview.html`. This fixture uses a simulated Home Assistant connection and includes OFF, ON, pending, and unavailable states.
