# Deploying ZEC Perps

This deploys the **transparent** ZEC perpetual venue: a user connects an Injective
wallet, holds USDT on Injective, and trades the live ZEC/USDT perp on Injective
mainnet. The shielded flow ships in **local** (self-custody, client-side
commit-reveal) mode by default; the relayer/omnibus path is optional and must not
custody real funds until audited (see `ROADMAP.md`).

## Important: config is build-time

`VITE_*` values are inlined into the client bundle at **build** time, not read at
runtime. Whatever host you use, the environment must be set **before `yarn build`**
(or passed as Docker `--build-arg`). Changing config means rebuilding.

## 1. Configure

```bash
cp .env.production.example .env
```

Set at minimum:
- `VITE_NAME` - product name shown in UI/meta.
- `VITE_BASE_URL` - your absolute public URL (meta/OG/sitemap).
- `VITE_NETWORK=mainnet`, `VITE_CHAIN_ID=injective-1` (where the ZEC perp lives).

To earn the builder share of trading fees, set `VITE_FEE_RECIPIENT` (your Injective
address) **and** your own endpoints (`VITE_INDEXER_API_ENDPOINT`,
`VITE_SENTRY_GRPC_ENDPOINT`, `VITE_SENTRY_REST_ENDPOINT`, ...). With the default
public endpoints, that fee share goes to the community pool instead.

## 2a. Deploy with Docker (SSR, recommended)

The repo-root `Dockerfile` builds a Nuxt SSR (Nitro node-server) image.

```bash
docker build \
  --build-arg VITE_NAME="ZEC Perps" \
  --build-arg VITE_BASE_URL="https://your-domain.example" \
  --build-arg VITE_FEE_RECIPIENT="inj1..." \
  -t zec-perps .

docker run -p 3000:3000 zec-perps
```

Put it behind a reverse proxy (Caddy/nginx/Cloudflare) for TLS. The server listens
on `0.0.0.0:3000` (`PORT`/`HOST` overridable at runtime).

## 2b. Deploy to a Node host (Render / Railway / Fly / VPS)

```bash
yarn install
cp .env.production.example .env   # edit it
yarn build
node .output/server/index.mjs     # serves on PORT (default 3000)
```

On managed platforms, set the `VITE_*` vars in the **build** environment (not just
runtime) so they are inlined. Start command: `node .output/server/index.mjs`.

## 2c. Deploy as a static site (Vercel / Netlify / CDN / Caddy)

Static export (client hydrates and fetches live data at runtime):

```bash
yarn build   # or: node_modules/.bin/nuxi generate
# output: .output/public  -> upload to any static host / CDN
```

Or use the static + Caddy image: `docker build -f .github/Dockerfile -t zec-perps-static .`
(edit `.github/Caddyfile` for your domain/TLS).

## 3. Shielded flow in production

- `VITE_SHIELDED_MODE=local` (default): self-custody client-side commit-reveal. No
  extra infrastructure; safe to ship.
- `VITE_SHIELDED_MODE=relayer`: run the relayer (`relayer/`, see its README) and set
  `VITE_RELAYER_URL`. Keep the relayer in `DRY_RUN` or non-custodial (authz) mode;
  do not let a custodial omnibus hold real user funds before an audit (ROADMAP M5).

## 4. Restricted build networks

If your build environment blocks the SDK's data fetch (postinstall `fetch:data`),
run the resilient prep script before building:

```bash
yarn install --ignore-scripts
bash scripts/prepare-data.sh   # fetches injective-lists JSON via curl fallback
yarn build
```

## 5. Post-deploy checks

- The site loads and `/` redirects to `/futures/zec-usdt-perp`.
- Branding is "ZEC Perps"; only the ZEC market is selectable.
- ZEC market data (order book, mark price, funding, chart) loads.
- Connect a wallet with USDT on Injective and place a small test order.

## 6. Operating a real venue (read this)

This is a live financial venue. Consider your jurisdiction and obligations before
opening it to users. The geo/VPN flags (`VITE_GEO_IP_RESTRICTIONS_ENABLED`,
`VITE_VPN_CHECKS_ENABLED`) and the restricted-country list exist for this reason.
The transparent path is non-custodial (orders settle on Injective from the user's
own wallet). The shielded omnibus path is custodial and out of scope for real
funds until audited.
