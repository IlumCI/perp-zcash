#!/bin/bash
set -euo pipefail

# ZEC Perps - SessionStart hook for Claude Code on the web.
# Installs dependencies and ensures the generated Injective market/token JSON and
# Nuxt types exist, so eslint / typecheck / dev work in a fresh remote session.
# Web-only, synchronous, idempotent.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Harness sets CLAUDE_PROJECT_DIR; fall back to the repo root relative to this script.
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$PROJECT_DIR"

# 1) Dependencies. postinstall runs `yarn fetch:data`, which uses axios and can
#    fail behind a CONNECT-only HTTPS proxy; node_modules still installs, and the
#    JSON is backfilled below.
yarn install || true

# 2) Local env (mainnet + vendored layer) if not present.
[ -f .env ] || cp .env.example .env

# 3) Ensure app/json (gitignored, generated). Try the project script; if the
#    market/token JSON is still missing, backfill from injective-lists via curl.
if [ ! -f app/json/tokens/mainnet.json ]; then
  yarn fetch:data || true
fi

if [ ! -f app/json/tokens/mainnet.json ]; then
  echo "session-start: backfilling injective-lists JSON via curl"
  BASE="https://raw.githubusercontent.com/InjectiveLabs/injective-lists/master"
  mkdir -p app/json/marketMap/category app/json/marketMap/spot \
    app/json/marketMap/derivative app/json/marketMap/expiry \
    app/json/grid/spot app/json/grid/derivative \
    app/json/tokens app/json/denoms app/json/swap
  get() { curl -fsS "$BASE/$1" -o "$2" || echo "  warn: could not fetch $1"; }
  for net in devnet testnet mainnet; do
    get "json/helix/trading/market/categoryMap/$net.json" "app/json/marketMap/category/$net.json"
    get "json/helix/trading/spotMap/$net.json" "app/json/marketMap/spot/$net.json"
    get "json/helix/trading/derivativeMap/$net.json" "app/json/marketMap/derivative/$net.json"
    get "json/helix/trading/expiryMap/$net.json" "app/json/marketMap/expiry/$net.json"
    get "json/helix/trading/gridMarkets/spot/$net.json" "app/json/grid/spot/$net.json"
    get "json/helix/trading/gridMarkets/derivative/$net.json" "app/json/grid/derivative/$net.json"
    get "json/tokens/verified/$net.json" "app/json/tokens/$net.json"
    get "json/helix/trading/denoms/$net.json" "app/json/denoms/$net.json"
    get "json/helix/trading/swap/$net.json" "app/json/swap/$net.json"
  done
  get "json/geo/countries.json" "app/json/restrictedCountries.json"
  get "json/wallets/ofacAndRestricted.json" "app/json/blacklistedAddresses.json"
fi

# 4) Git version file (local git, no network).
yarn github:version || true

# 5) Nuxt types (needed by the eslint flat config and typecheck).
NUXT_TELEMETRY_DISABLED=1 yarn nuxi prepare || true

echo "session-start: ready"
