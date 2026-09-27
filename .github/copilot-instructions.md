# Project instructions

This project is sonoff-outdoor-light-card, a small Home Assistant dashboard card.

- Write all documentation, code comments, and project text in English only.
- Use TypeScript, Lit and Rollup, with strict typing.
- Main file: src/sonoff-outdoor-light-card.ts. Configuration types: src/types.ts.
- The only required option is entity; name is optional.
- Use hass.states and hass.callService for existing switch entities.
- Keep the card and visual editor configurations aligned.
- Use Home Assistant theme variables and accessible controls.
- Handle missing entities, unsupported domains, unavailable states and service errors.
- Keep the implementation small. No direct device APIs or backend.
- Install with npm install; check with npm run build and npm test.
- Update README when configuration or installation changes.
