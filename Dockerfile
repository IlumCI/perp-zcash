# syntax=docker/dockerfile:1
# Canonical production image: Nuxt SSR (Nitro node-server) for ZEC Perps.
# Defaults target the live ZEC/USDT perp on Injective mainnet. Override public
# config with --build-arg (VITE_* values are inlined into the client at build).

# ---- Builder ----
FROM node:22-slim AS builder
RUN apt-get update \
  && apt-get install -y --no-install-recommends git curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=6144

ARG VITE_NAME="ZEC Perps"
ARG VITE_BASE_URL="http://localhost:3000"
ARG VITE_NETWORK="mainnet"
ARG VITE_CHAIN_ID="injective-1"
ARG VITE_ETHEREUM_CHAIN_ID="1"
ARG VITE_FEE_RECIPIENT=""
ARG VITE_FEE_PAYER_PUB_KEY=""
ARG VITE_SHIELDED_ENABLED="true"
ARG VITE_SHIELDED_MODE="local"
ARG VITE_RELAYER_URL=""
ARG VITE_SHIELDED_REVEAL_WINDOW_MS="15000"

# Install deps (skip the fragile app postinstall; data is prepared resiliently
# below). --ignore-scripts is safe for this pure-JS dependency set.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts --network-timeout 600000

# Source + build-time public config.
COPY . .
RUN printf '%s\n' \
  "LOCAL_LAYER=true" \
  "VITE_NAME=${VITE_NAME}" \
  "VITE_BASE_URL=${VITE_BASE_URL}" \
  "VITE_NETWORK=${VITE_NETWORK}" \
  "VITE_CHAIN_ID=${VITE_CHAIN_ID}" \
  "VITE_ETHEREUM_CHAIN_ID=${VITE_ETHEREUM_CHAIN_ID}" \
  "VITE_FEE_RECIPIENT=${VITE_FEE_RECIPIENT}" \
  "VITE_FEE_PAYER_PUB_KEY=${VITE_FEE_PAYER_PUB_KEY}" \
  "VITE_MAINTENANCE_DISABLED=false" \
  "VITE_VPN_CHECKS_ENABLED=false" \
  "VITE_GEO_IP_RESTRICTIONS_ENABLED=false" \
  "VITE_SHIELDED_ENABLED=${VITE_SHIELDED_ENABLED}" \
  "VITE_SHIELDED_MODE=${VITE_SHIELDED_MODE}" \
  "VITE_RELAYER_URL=${VITE_RELAYER_URL}" \
  "VITE_SHIELDED_REVEAL_WINDOW_MS=${VITE_SHIELDED_REVEAL_WINDOW_MS}" \
  > .env
RUN bash scripts/prepare-data.sh
RUN yarn build

# ---- Runtime ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
COPY --from=builder /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
