# coffee timer

A pour-over coffee timer with reusable recipes, step-by-step guidance, and gentle audio cues.
Water targets are cumulative, so you can leave your server on the scale without taring between pours.
No account or backend is required: recipes, brew records, and preferences stay in your browser.

[Open the app](https://coffee.sunvisor.net)

## Features

- Japanese and English UI, switchable in Settings
- Create, edit, delete, and reorder recipes
- Record coffee weight, water amount, temperature, preparation, and pour/wait steps
- Markdown descriptions with line breaks
- Automatic step transitions, countdowns, and audio cues
- Cumulative scale readings, pause/resume, skip, and stop controls
- Warnings when recipe water and step totals differ
- Brew records with actual step durations, pauses, and skips
- Create a new recipe from a brew record
- JSON recipe export and import, with add and replace modes
- Installable PWA with offline support after the first successful load

## Brewing

1. Choose a recipe on the home screen. A sample recipe is included.
2. Read the preparation notes and prepare your equipment and coffee.
3. Place your server on the scale, tare it to zero, and select **Start brewing**.
4. Follow the countdown and cumulative water targets. Do not tare between pours.
5. Enjoy your coffee and review the actual steps on the completion screen.

The timer's round controls are stop (upper left), pause/resume (upper right), and skip (lower left).
Skipped pour steps still contribute their specified water amount to later cumulative targets.
**Overall** shows actual elapsed time, including pauses, against an estimated total. Pausing extends the
total; skipping removes the unexecuted part of a step.

Water warnings compare 1 ml of water with approximately 1 g. They do not prevent saving or brewing.
Audio cues use media playback volume. Keep the app open while brewing; background execution and
notifications during sleep are not guaranteed.

Supported HTTPS browsers keep the screen awake while viewing a recipe and while brewing, including
pauses. The lock is released on completion or when leaving for home or the editor, and acquired again
when returning to a recipe. Battery-saving settings may prevent this feature from working.

Browser back/forward navigates between app screens. During brewing, history navigation is blocked;
use the stop control to leave. Navigation outside the site and OS gestures cannot be fully disabled.

## Language

Open **Settings → Language** to choose **日本語** or **English**. Japanese is the default.
The choice is saved locally, applies immediately, and is shared with other open tabs.
UI text, accessibility labels, dialogs, errors, dates, and durations follow the selected language.
Your recipe text and existing brew records are preserved. Only the unsaved sample recipe changes
language automatically.

## Brew records

Completing a brew automatically saves the recipe snapshot, timestamps, and actual step durations.
Skipped steps record only the time up to the skip; pauses are added to the current step.
Stopped or unfinished brews are not saved.

Open **Settings → View brew records** for a list of titles and start dates, then select a record for details.
**Save as recipe** opens an editable copy using the measured durations, including pauses.
Times are rounded up to whole seconds, with a minimum of one second. Water amounts remain the
original recipe values; actual water quantities are not measured.

Records are stored separately in localStorage, limited to the latest 100 records and approximately 1 MB.
Older records are removed as limits or storage pressure require. Editing or deleting the original recipe
does not change existing records. Recipe backup files do not include brew records or language settings.

## Recipes and backups

Storage is specific to the browser and site origin. Recipes do not sync automatically between devices,
browsers, or local and deployed instances. Export a JSON backup from Settings before clearing browser
data or changing devices.

Imports add recipes by default, with new IDs. Replace mode asks for confirmation before replacing the
entire recipe list. See the [app documentation](app/README.md#backup-format) for the file format.

## Local development

Use Node.js 24 and npm. Run these commands from the repository root:

```sh
npm ci --prefix app
npm run dev --prefix app
```

Open the URL printed by Vite. The development server does not enable a service worker.
To preview the production build and PWA:

```sh
npm run build --prefix app
npm run preview --prefix app
```

## Checks and CI

```sh
npm test --prefix app
npm run lint --prefix app
npm run check:pwa --prefix app
```

`check:pwa` runs TypeScript checks, a production build, and checks of the manifest, icons, registration,
and precached assets. Output is written to `app/dist`.

[GitHub Actions](.github/workflows/ci.yml) runs on pull requests when opened, updated, or reopened,
using Node.js 24. It installs dependencies and runs lint, tests, type checks, the production build, and
PWA checks. Older runs for the same PR are cancelled. Pushes and merges to main do not trigger CI.

## Installation and updates

After the first successful HTTPS load and service worker setup, the app works offline.
External images and links in Markdown require a network connection.

- Android / desktop: use the browser's install option.
- iPhone / iPad: use Safari's share menu and **Add to Home Screen**.

The app checks for updates on startup, foreground resume, reconnection, and every minute while visible.
When an update is ready, an **Update** button appears on the home screen. Updates require confirmation;
the app does not reload while you are brewing or editing, even when another tab activates an update.

## Cloudflare deployment

The app deploys to Cloudflare Workers Static Assets. From the repository root:

```sh
npm ci --prefix deploy
npm run login --prefix deploy
./deploy/deploy.sh
```

Use `./deploy/deploy.sh --dry-run` to validate without publishing.
See [deployment instructions](deploy/README.md) for commands inside `deploy`, authentication,
and deployment names.

## Project layout

| Directory | Contents |
| --- | --- |
| `app/` | React / TypeScript / Vite app, tests, translations, and PWA configuration |
| `deploy/` | Cloudflare deployment script, Wrangler configuration, and instructions |

React Compiler is enabled. Vite PWA generates the service worker; Vitest and Testing Library run tests.
See the [app documentation](app/README.md) for storage details and instructions for adding languages.

## License

[MIT License](LICENSE)
