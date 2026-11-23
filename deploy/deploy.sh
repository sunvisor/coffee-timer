#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${DEPLOY_DIR}/../app"

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo 'Node.js and npm are required. Install Node.js 24 before deploying.' >&2
  exit 1
fi

npm ci --prefix "$DEPLOY_DIR"
npm ci --prefix "$APP_DIR"
npm run build --prefix "$APP_DIR"

cd "$DEPLOY_DIR"
exec ./node_modules/.bin/wrangler deploy --config "$DEPLOY_DIR/wrangler.jsonc" "$@"
