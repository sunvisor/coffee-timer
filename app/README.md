# coffee timer app

A browser-only pour-over timer built with React, TypeScript, Vite, and React Compiler.
See the [project README](../README.md) for user-facing features and usage.

## Development

Use Node.js 24 and npm:

```sh
cd app
npm ci
npm run dev
```

For access from a phone on the same network, run `npm run dev -- --host 0.0.0.0` and open the
Network URL. Recipe and step IDs work over HTTP. PWA installation, service workers, and screen wake
locks require an appropriate secure context; use the HTTPS deployment for device testing.

```sh
npm test
npm run lint
npm run build
npm run check:pwa
npm run preview
```

Tests use Vitest, Testing Library, and jsdom. `build` runs TypeScript checks and creates `dist`.
`check:pwa` also validates the manifest, PNG sizes, service worker registration, update activation,
and precached assets. Use the production preview or HTTPS deployment for device-level PWA checks.

## Localization

Japanese is the default. Settings provides a language selector; the preference is stored in
`coffee-timer.language.v1`. Unsupported stored language codes fall back to Japanese.
Changing language updates mounted components without navigating or discarding input.
Language changes in another tab are synchronized through storage events.

- `src/locales/ja.ts`: source message keys and Japanese text
- `src/locales/en.ts`: English catalog, checked against the source keys by TypeScript
- `src/i18n.ts`: language registry, persistence, interpolation, formatting, and localized errors
- `src/useI18n.ts`: React subscription and translation helpers

Components use `useI18n()` and `t('message.key', { parameter: value })`. Plain TypeScript helpers use
`translate()`. Use `TranslationError` for errors that must remain translatable after a language change.
Parameters are interpolated once as text; recipe names are never treated as translation keys or HTML.
Numbers use `Intl.NumberFormat`; record dates use the locale registered for the selected language.

### Adding a language

1. Add `src/locales/<code>.ts`, exporting a `Record<keyof typeof ja, string>` catalog.
2. Translate every key and keep the same named placeholders, such as `{count}` and `{name}`.
   Translate complete sentences rather than joining fragments that depend on word order.
3. Import the catalog in `src/i18n.ts` and add its code, native display name, locale, and messages to
   `languages`. The Settings selector and supported-language type are derived from this registry.
4. Run tests, lint, and `check:pwa`. Catalog tests check key and placeholder parity for all registered
   languages; add UI coverage for any language-specific layout or formatting requirements.

Saved recipe content and brew snapshots are user data and are not translated automatically.
The unsaved sample recipe is localized dynamically. Saving it makes it normal recipe data, preserving
the selected text thereafter. HTML language, title, and description follow the UI preference.
The install manifest uses the language-neutral name `coffee timer` and an English description;
changing the UI language does not rename an already installed app.

## Recipes and validation

Recipes are stored in localStorage under `coffee-timer.recipes.v1`.
The initial sample is shown only when no saved recipe data exists.
Recipe IDs are unique across the list, and task IDs are unique within a recipe.
Names must not be blank. Steps take integer durations from 1 to 86400 seconds.
Pour amounts must be positive; wait steps use zero water. Temperature must be greater than 0 and
no more than 100 degrees Celsius.

Markdown descriptions and preparation preserve line breaks. Embedded HTML is not executed.
Water mismatches are advisory, comparing 1 ml of water with approximately 1 g; they do not block
saving or brewing. Invalid numeric input is excluded from the comparison until corrected.

Before saving, the app compares the current storage contents with its loaded snapshot.
If another tab changed the data, saving is blocked and editor input is preserved. Copy your edits,
reload, and apply them to the latest recipe list. Invalid saved data is not silently overwritten.

## Timer and audio

Starting a brew prepares Web Audio during the user interaction. If audio cannot be enabled, the
timer still starts and explains the problem on screen. Leaving the recipe while audio is preparing
cancels the pending start and closes its audio context.

Steps advance automatically. The timer catches up using elapsed time when callbacks are delayed.
Pause freezes the step countdown. Skip advances immediately, preserving pause state when paused.
Skipped pour steps count their full specified water amount toward subsequent scale targets.
**Overall** shows actual elapsed time including pauses and an estimated total based on that elapsed
time plus the remaining planned duration. Skipping removes unexecuted time from the estimate.

Audio uses media playback volume. Keep the app open while brewing; background execution and audio
while sleeping are not guaranteed. Supported HTTPS browsers request a screen wake lock from recipe
details through brewing, including pauses. It is released on completion or on leaving for home or
the editor, and reacquired when returning to a recipe or to the visible tab.
Unsupported environments, low battery, and power-saving settings may prevent acquisition.
Manual locking and OS-forced sleep are not overridden. See the
[Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).

## Navigation

React Router uses hash URLs such as `/#/settings` and `/#/recipes/house-blend`.
No server rewrite rules are needed, including for offline startup.
Browser back/forward navigates within the app, but history changes are blocked during brewing.
Stop and completion buttons provide explicit navigation. Browsers may show a confirmation when
reloading or closing an active timer.

In-progress sessions are not persisted. Opening or reloading a timer URL returns to recipe details.
Unsaved editor and ordering changes are discarded when leaving their screen.
The router cannot fully prevent leaving the site from home or OS-level app gestures.
See [hash routing](https://reactrouter.com/api/data-routers/createHashRouter) and
[navigation blocking](https://reactrouter.com/api/hooks/useBlocker).

## Brew records

Completing a brew records start/end timestamps, a recipe snapshot, and each step's active duration,
paused duration, and skipped flag. Durations are stored in milliseconds and displayed in seconds.
Skipping records time up to the click. Pauses belong to the current step. When skipping while paused,
subsequent paused time belongs to the next step. Stopped, reloaded, or abandoned sessions are not saved.

The completion screen displays actual steps. Settings links to the record list and details at
`/#/logs` and `/#/logs/{id}`. Records retain the original contents even after a recipe is edited or deleted.
Water amounts are specified recipe values; no scale measurements are recorded.

**Save as recipe** creates a new ID and opens an editable copy. Step durations include both active and
paused time, rounded up to whole seconds with a minimum of one second. If a step exceeds 86400 seconds,
adjust it in the editor before saving.

Records are stored separately under `coffee-timer.brew-logs.v1`. Retention keeps the latest 100 entries
and limits JSON length times two to 1,000,000 bytes. Oldest start timestamps are removed first.
Quota errors trigger retries with fewer old records. If saving still fails, the completion screen shows
an error and retry button. Failed writes preserve previously stored data.
Where available, Web Locks serialize cross-tab appends, reading the latest records before writing.
Records and language preferences are not included in recipe backup files.

## Backup format

The JSON root is an array of recipes:

```json
[
  {
    "id": "my-recipe",
    "name": "One cup",
    "description": "**Everyday recipe**\nMedium-fine grind",
    "coffee": 15,
    "water": 250,
    "temperature": 92,
    "preparation": "Rinse the filter",
    "tasks": [
      { "id": "pour-1", "type": "pour", "description": "Pour water", "seconds": 30, "amount": 250 },
      { "id": "wait-1", "type": "wait", "description": "Let it drain", "seconds": 60, "amount": 0 }
    ]
  }
]
```

Imports validate the entire file before saving. Files must be no larger than 5 MB.
The preview defaults to adding recipes, assigning new recipe IDs. Importing again adds duplicates.
Replace mode asks for confirmation and accepts an empty array to clear the list.
The exported format and storage keys are identical in every UI language.

## PWA and deployment

The first successful HTTPS load precaches the app for offline use. External Markdown images and links
are not included. Android and desktop browsers offer installation; on iPhone/iPad, use Safari's
**Add to Home Screen**.

The app checks for updates at startup, foreground resume, reconnection, and every minute while visible.
A ready update appears on home. After confirmation, it waits for the new worker to take control before
reloading. Updates activated in other tabs do not reload a timer or editor without approval on home.
The development server disables service workers.

Workbox's build dependency `glob` is overridden to a version with known vulnerabilities fixed.
See [Vite PWA update behavior](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html).
The generated `dist` directory is a static site; see [deployment instructions](../deploy/README.md).
