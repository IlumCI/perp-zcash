# ZEC Perps - architecture and design

## Goal and philosophy

Trade ZEC perpetuals by reusing what is proven, and differentiate only where
there is a genuine opening. The proven core is **Injective's on-chain
central-limit order book** (the same class of venue as Hyperliquid), reached
through an existing, production-grade frontend (Injective PDaaS/Helix). The
opening is **privacy**: ZEC perps exist on many venues, but a privacy-preserving
ZEC perp does not — so the bleeding-edge layer is a **sealed-order (shielded)
flow**, kept additive so the proven path is never at risk.

## Layers

### 1. Venue (unchanged, proven)

Injective mainnet's `ZEC/USDT PERP`
(`0xef0dd633da52cfc21db866b05463c8b43c02265b86bf9257a5d39848cd2eea11`),
oracle-priced (Pyth ZEC/USD), USDT-margined, cash-settled. The app queries and
trades it via `@injectivelabs/sdk-ts`. No matching engine is built here.

### 2. ZEC-only curation + rebrand (Phase A/B)

- Verified-market allowlist narrowed to the ZEC perp; re-applied after the
  upstream CDN refresh so it holds (`components/App/JsonPoll.vue`,
  `app/data/zcash.ts`).
- Default route and selectors point at ZEC only.
- Neutral, emoji-free rebrand; `Injective` retained where factually the venue.

### 3. Shielded order flow (Phase C, additive, feature-flagged)

A commit-reveal / sealed-order layer in front of the transparent book.

Lifecycle: **seal** (commit `SHA-256(order || salt)`, hide the order) -> **anchor**
(publish the commitment) -> **batch/reveal** (after a window) -> **execute** ->
**settle**.

- **Local mode** (`store/shielded`, `app/shielded`): client-side commit-reveal;
  the order is withheld in the browser for the reveal window, then submitted from
  the trader's own wallet. Real pre-trade secrecy, no relayer.
- **Relayer mode** (`relayer/`): the sealed order goes to a relayer that batches,
  anchors, and executes from a pooled (omnibus) account -> identity
  unlinkability. Dry-run by default (runs with no funds); guarded real execution
  via a funded key.
- **Anchor** (`contracts/anchor/`): CosmWasm commitment record on Injective
  testnet (mainnet CosmWasm upload is governance-gated); the relayer's `memo`
  self-transfer is the zero-deploy mainnet fallback.

## Honest privacy boundary

| Property | Provided? | Notes |
|---|---|---|
| Pre-trade secrecy | Yes, until reveal | Order is off the public book during the seal window; at reveal it becomes a normal public Injective order. |
| Identity unlinkability | Relayer/omnibus only, conditionally | Needs a real anonymity set + pooled deposits; single-trader batches are linkable. Local mode does not provide it. |
| Post-trade position privacy | No | Injective positions/funding/liquidations are public per subaccount. Real per-trader privacy needs a shielded collateral pool with zk accounting. |
| Intra-block MEV | Handled by the venue | Injective runs an in-block frequent batch auction at a uniform clearing price; this layer targets cross-block secrecy, not intra-block ordering. |
| Relayer trust | Trusted (prototype) | Sees plaintext in-window; can censor/reorder. Threshold/committee encryption removes in-window trust (stretch). |

## Roadmap (staged)

1. MVP (built): hash commitment + timed reveal (local) and dry-run relayer with
   commitment verification + on-chain anchor.
2. Non-custodial relayer via `authz` (`MsgGrant`/`MsgExec` on the trader's own
   subaccount): self-custody, pre-trade secrecy, no unlinkability.
3. zk proof that `reveal == commitment` / batch membership (Groth16 or Noir).
4. Threshold-encrypted seal so no single relayer can decrypt in-window.
5. Shielded collateral pool + zk per-trader accounting: real post-trade privacy.

## Grounding literature

FairTraDEX (arXiv:2202.06384), SPEEDEX (arXiv:2111.02719), Rialto
(arXiv:2111.15259), F3B threshold mempool (arXiv:2205.08529); perp-specific
"Reveal, Correct, Then Pay" (arXiv:2607.13832), which notes that sealing order
flow delays funding-rate correction - relevant because this is a perp venue.
Perp mechanics: "Fundamentals of Perpetual Futures" (arXiv:2212.06888).
