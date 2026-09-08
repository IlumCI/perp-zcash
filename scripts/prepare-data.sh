#!/bin/bash
set -euo pipefail

# Resilient build-time data prep for CI / Docker / restricted networks.
#
# The app statically imports generated JSON from app/json (market maps, tokens,
# denoms, swap routes) plus app/json/gitVersion.json. Normally `postinstall`
# (`yarn fetch:data && yarn github:version`) produces these, but that is fragile
# in two ways this script fixes:
#   1) fetch:data uses axios, which fails behind CONNECT-only HTTPS proxies.
#   2) github:version uses git, which a Docker/CI checkout often lacks.
#
# Idempotent: safe to run repeatedly; skips work that is already done.

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# 1) Market / token lists.
if [ ! -f app/json/tokens/mainnet.json ]; then
  yarn fetch:data || true
fi

if [ ! -f app/json/tokens/mainnet.json ]; then
  echo "prepare-data: backfilling injective-lists JSON via curl"
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

# 2) Git version file (fall back to a static value when git is unavailable).
if [ ! -f app/json/gitVersion.json ]; then
  if ! yarn github:version >/dev/null 2>&1; then
    echo "prepare-data: writing static gitVersion.json (no git checkout)"
    printf '%s' '{"branch":"main","tag":"unreleased","gitTagLink":"","logs":[]}' \
      > app/json/gitVersion.json
  fi
fi

echo "prepare-data: done"
