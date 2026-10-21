#!/usr/bin/env bash
set -euo pipefail
cd /workspace/Cook-or-kaboom
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major < 22 || (major === 22 && minor < 12)) { console.error("Cook or KABOOM requires Node.js 22.12+; the prepared environment uses Node 24.19.0."); process.exit(1); }'
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run build
npm test
