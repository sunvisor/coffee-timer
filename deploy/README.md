# Deploying to Cloudflare

Publish `app/dist` with Cloudflare Workers Static Assets. No server code or database is required.

## Initial setup

Install Node.js 24 and npm, and have a Cloudflare account ready.
From the repository root:

```sh
npm ci --prefix deploy
npm run login --prefix deploy
npm run whoami --prefix deploy
```

If you are already inside `deploy`, omit `--prefix deploy`:

```sh
npm ci
npm run login
npm run whoami
```

Login opens a browser. Authenticate with the account you want to deploy to.
If you use multiple accounts, select the target account explicitly:

```sh
export CLOUDFLARE_ACCOUNT_ID='your-account-id'
```

The Worker name is configured in `deploy/wrangler.jsonc`, defaulting to `coffee-timer`.
Deploying updates an existing Worker with the same name in that account.
Change `name` or pass `--name` to publish under another name.

## Deploy

From the repository root:

```sh
./deploy/deploy.sh
```

From inside `deploy`, run `./deploy.sh` instead.
The script works independently of your current directory and:

1. Installs `deploy` and `app` dependencies from their lockfiles.
2. Runs TypeScript checks and the Vite production build.
3. Uploads `app/dist` with Wrangler.

The script stops on errors. Wrangler prints the public URL on success.
The default destination is `workers.dev`; follow Wrangler's prompts if first-time subdomain setup
is required.

The same deployment also serves the promotional pages at `/about/` (Japanese) and `/about/en/`
(English). No separate Worker, DNS entry, or subdomain is needed.

To validate the build and deployment configuration without publishing:

```sh
./deploy/deploy.sh --dry-run
```

Wrangler deploy options are forwarded unchanged:

```sh
./deploy/deploy.sh --name my-coffee-timer
```

## CI authentication

Store a Cloudflare Workers deployment API token in your CI secrets and expose it as
`CLOUDFLARE_API_TOKEN`, together with `CLOUDFLARE_ACCOUNT_ID`.
Do not add tokens to scripts, configuration files, or commits.

The repository's PR workflow validates the app; it does not deploy automatically.

## Local browser data

Recipes, brew records, and language preferences stay in each user's browser.
Local development data does not move to the deployed origin automatically.
To migrate recipes, export JSON in the local Settings screen and import it on the deployed site.
Brew records and language preferences are not part of recipe exports.

## Official references

- [Deploy Static Assets](https://developers.cloudflare.com/workers/static-assets/get-started/)
- [Wrangler deploy command](https://developers.cloudflare.com/workers/wrangler/commands/workers/)
- [Authentication environment variables](https://developers.cloudflare.com/workers/wrangler/system-environment-variables/)
