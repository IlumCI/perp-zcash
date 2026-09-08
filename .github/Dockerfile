# syntax=docker/dockerfile:1
# Alternative deploy: static export (nuxi generate) served by Caddy - cheap,
# CDN-friendly hosting. The canonical SSR image is the repo-root Dockerfile.
# VITE_* values are inlined at build time; override with --build-arg.

FROM node:22-slim AS builder
RUN apt-get update \
  && apt-get install -y --no-install-recommends git curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /src
ENV NODE_OPTIONS=--max-old-space-size=6144

ARG VITE_NAME="ZEC Perps"
ARG VITE_BASE_URL="http://localhost"
ARG VITE_FEE_RECIPIENT=""
ARG VITE_FEE_PAYER_PUB_KEY=""

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts --network-timeout 600000

COPY . .
RUN printf '%s\n' \
  "LOCAL_LAYER=true" \
  "VITE_NAME=${VITE_NAME}" \
  "VITE_BASE_URL=${VITE_BASE_URL}" \
  "VITE_NETWORK=mainnet" \
  "VITE_CHAIN_ID=injective-1" \
  "VITE_ETHEREUM_CHAIN_ID=1" \
  "VITE_FEE_RECIPIENT=${VITE_FEE_RECIPIENT}" \
  "VITE_FEE_PAYER_PUB_KEY=${VITE_FEE_PAYER_PUB_KEY}" \
  "VITE_MAINTENANCE_DISABLED=false" \
  "VITE_VPN_CHECKS_ENABLED=false" \
  "VITE_GEO_IP_RESTRICTIONS_ENABLED=false" \
  "VITE_SHIELDED_ENABLED=true" \
  "VITE_SHIELDED_MODE=local" \
  "VITE_SHIELDED_REVEAL_WINDOW_MS=15000" \
  > .env
RUN bash scripts/prepare-data.sh
RUN node_modules/.bin/nuxi generate

FROM caddy:latest
# Serve the static export. Edit .github/Caddyfile for your domain/TLS.
COPY --from=builder /src/.output/public /root/dist
COPY .github/Caddyfile /root/Caddyfile
CMD ["caddy", "run", "--config", "/root/Caddyfile"]
