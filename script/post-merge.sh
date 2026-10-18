#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Reconcile the lockfile without prompts; include build tools even if NODE_ENV
# is inherited as production. Never push database schema automatically.
node script/check-lockfile-hosts.mjs
npm ci --include=dev --no-audit --no-fund
npm run check
npm run build
npx --no-install tsx --test server/seo.test.ts script/prerender.test.ts
