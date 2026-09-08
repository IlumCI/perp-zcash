# ZEC Perps

A single-market perpetual-futures DEX for trading **Zcash (ZEC)** long and short,
with an optional **shielded (sealed-order) flow**.

The venue is **Injective**: matching, the order book, funding, and liquidations
run on Injective's on-chain central-limit order book. This app is a curated,
rebranded fork of Injective's PDaaS/Helix frontend — the proven perp-DEX stack —
narrowed to the ZEC/USDT perpetual and extended with a prototype privacy layer.

## What is and isn't real

- **The ZEC perpetual is real.** `ZEC/USDT PERP` already exists on Injective
  mainnet (marketId `0xef0dd633da52cfc21db866b05463c8b43c02265b86bf9257a5d39848cd2eea11`),
  is oracle-priced (Pyth ZEC/USD), USDT-margined, and cash-settled. This app does
  not run a matching engine; it trades against Injective's.
- **Zcash L1 is not the venue.** Zcash has no smart contracts, so — like every
  other ZEC perp (Hyperliquid, Binance, etc.) — ZEC is the priced asset, not the
  settlement chain.
- **The shielded flow is a prototype.** It adds pre-trade secrecy and (via the
  relayer) identity unlinkability on top of Injective's transparent book. It does
  not make Injective private. See "Shielded order flow" and its honest limits.

## Architecture

```
Browser (Nuxt 3 / Vue 3)  --@injectivelabs/sdk-ts-->  Injective mainnet
   ZEC-only UI, wallet, order form                    ZEC/USDT perp CLOB (Pyth oracle)

Shielded layer (opt-in, additive):
   app/shielded/  ---- commitment + seal ---->  relayer/ (batch, anchor, execute)
   store/shielded/  (local commit-reveal)       contracts/anchor/ (testnet audit trail)
```

- **Phase A — ZEC-only venue.** The verified-market map is curated to the single
  ZEC perp (`components/App/JsonPoll.vue` re-applies this after the upstream CDN
  refresh), routing/defaults point at ZEC (`pages/index.vue`, `pages/futures.vue`,
  `types/enums`), and selectors are filtered to verified-only
  (`components/Common/Headless/Markets.vue`). Config in `app/data/zcash.ts`.
- **Phase B — minimal rebrand.** Naming, meta, favicons, logo, and copy moved off
  PDaaS/Helix to a neutral ZEC identity. `Injective` references remain where
  accurate (the venue is Injective).
- **Phase C — shielded order flow.** Additive and feature-flagged; the plain
  transparent path is unchanged.

## Getting started

Prerequisites: Node 20–22, Yarn Classic 1.x.

```bash
yarn install         # postinstall fetches the Injective market/token lists
cp .env.example .env # VITE_NETWORK=mainnet by default
yarn dev             # http://127.0.0.1:3000
```

The app opens on `/futures/zec-usdt-perp`. Read-only views (chart, order book,
funding) need no wallet; placing a real trade needs USDT on Injective.

> Note: `postinstall` runs `yarn fetch:data` to download the market/token JSON
> into `app/json/` (gitignored). Behind a strict HTTPS proxy that only accepts
> CONNECT tunnels, the axios-based fetch can fail; if `app/json/**` is missing
> after install, fetch the same files over `curl` (see `scripts/*.ts` for the
> `injective-lists` URLs) or run on an unproxied network.

## Shielded order flow

Enable the **Shielded** toggle in the futures order form. Two modes
(`VITE_SHIELDED_MODE`):

- **local** (default): client-side commit-reveal. The order is committed
  (SHA-256 of the order + salt), withheld from the public book for
  `VITE_SHIELDED_REVEAL_WINDOW_MS`, then submitted from your own wallet. Provides
  **pre-trade secrecy**; identity/position stay public. No relayer needed.
- **relayer**: the sealed order is sent to the `relayer/` service, which batches,
  anchors the commitment, and executes it from a pooled (omnibus) account —
  adding **identity unlinkability**. Requires running the relayer.

Config: `VITE_SHIELDED_ENABLED`, `VITE_SHIELDED_MODE`, `VITE_RELAYER_URL`,
`VITE_SHIELDED_REVEAL_WINDOW_MS` (see `.env.example`).

### Privacy boundary (no overclaiming)

- **Pre-trade secrecy** — real, only until reveal. At reveal the order becomes a
  normal, public Injective order. In relayer mode the relayer sees plaintext
  during the window (trusted; threshold encryption is the stretch to remove this).
- **Identity unlinkability** (relayer/omnibus) — real only with a real anonymity
  set and pooled deposits; single-trader batches are trivially linkable.
- **Post-trade position privacy** — not provided. Injective positions, funding,
  and liquidations are public per subaccount. Real per-trader post-trade privacy
  needs a shielded collateral pool with zk accounting (roadmap).
- Injective already runs an in-block frequent batch auction at a uniform clearing
  price, so this layer targets cross-block secrecy and unlinkability, not
  intra-block MEV.

## Repository layout

- `app/shielded/` — client commitment + relayer client.
- `store/shielded/` — Pinia store: seal-and-schedule (local + relayer).
- `relayer/` — standalone Node/TS relayer service (dry-run by default). See its README.
- `contracts/anchor/` — CosmWasm commitment anchor (Injective testnet). See its README.
- `app/data/zcash.ts` — the ZEC market constants and ZEC-only allowlist.

## Roadmap

Staged path from the shipped MVP to a private, decentralized ZEC perp - live
execution and non-custodial mode, zk-verified reveal, trustless (threshold)
sealing, a shielded collateral pool for post-trade privacy, and
decentralization. See `ROADMAP.md`.

## References

Shielded design grounded in: FairTraDEX (arXiv:2202.06384), SPEEDEX
(arXiv:2111.02719), Rialto (arXiv:2111.15259), F3B threshold mempool
(arXiv:2205.08529), and the perp-specific "Reveal, Correct, Then Pay"
(arXiv:2607.13832). Perp mechanics: "Fundamentals of Perpetual Futures"
(arXiv:2212.06888).

## License

Apache-2.0. This is a fork of Injective's PDaaS/Helix frontend.
Copyright © 2021 - 2025 Injective Foundation (https://injectivelabs.org/).
