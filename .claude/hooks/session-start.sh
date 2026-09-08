#!/bin/bash
set -euo pipefail

# ZEC Perps - SessionStart hook for Claude Code on the web.
# Installs dependencies and prepares generated data + Nuxt types so eslint /
# typecheck / dev work in a fresh remote session. Web-only, idempotent.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Harness sets CLAUDE_PROJECT_DIR; fall back to the repo root relative to this script.
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$PROJECT_DIR"

# 1) Dependencies. postinstall may fail behind a CONNECT-only HTTPS proxy;
#    node_modules still installs, and data is prepared resiliently below.
yarn install || true

# 2) Local env (mainnet + vendored layer) if not present.
[ -f .env ] || cp .env.example .env

# 3) Generated data (injective-lists JSON + gitVersion), resilient to proxy/git.
bash scripts/prepare-data.sh || true

# 4) Nuxt types (needed by the eslint flat config and typecheck).
NUXT_TELEMETRY_DISABLED=1 yarn nuxi prepare || true

echo "session-start: ready"
