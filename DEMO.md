# ZEC Perps - demo guide

A hackathon demo of a **ZEC-only perpetual-futures DEX on Injective** with a
**shielded (sealed-order) flow**. This guide has the pitch, setup, a
step-by-step walkthrough, and honest talking points for judges.

## Pitch (30 seconds)

Trading ZEC perps is not novel - many venues list them. So we did not reinvent
the venue: we run on **Injective's on-chain central-limit order book** (the same
proven class as Hyperliquid) and trade the **real ZEC/USDT perpetual that already
exists on Injective mainnet**. What is novel is **privacy**: no privacy-preserving
ZEC perp exists. So the differentiator is a **shielded order flow** - orders are
committed and withheld from the public book until a batch reveal, and (in relayer
mode) executed from a pooled account so they are not linkable to the trader.

We are deliberate about honesty: this gives real pre-trade secrecy and identity
unlinkability, but not post-trade position privacy (that needs a shielded pool
with zk accounting - our roadmap).

## What's in the repo

- ZEC-only venue + minimal rebrand (Injective PDaaS/Helix fork, curated to ZEC).
- `app/shielded/`, `store/shielded/` - client commit-reveal + relayer client.
- `relayer/` - standalone relayer service (seal -> batch -> anchor -> execute).
- `contracts/anchor/` - CosmWasm commitment anchor (Injective testnet).
- `docs/ARCHITECTURE.md` - design + honest privacy boundary + roadmap.

## Setup

```bash
yarn install          # postinstall fetches Injective market/token lists
cp .env.example .env  # VITE_NETWORK=mainnet; VITE_SHIELDED_ENABLED=true
yarn dev              # http://127.0.0.1:3000  -> redirects to /futures/zec-usdt-perp
```

Optional - relayer mode (identity unlinkability):

```bash
cd relayer && cp .env.example .env && npm install && npm start   # dry-run by default
# then in the app .env: VITE_SHIELDED_MODE=relayer, VITE_RELAYER_URL=http://localhost:8888
```

Notes:
- Run on a normal network. The app fetches live market data from Injective; a
  restrictive proxy that blocks the SDK's calls will leave the UI on the loading
  screen (that is an environment limitation, not the app).
- Read-only views need no wallet. Placing a real trade needs USDT on Injective.

## Walkthrough

1. **Land on the venue.** Open the app - it redirects to `/futures/zec-usdt-perp`.
   Point out the ZEC-only nav (Trade, Deposit), the "ZEC Perps" branding, and that
   the market selector shows only the Zcash perp.
2. **Transparent trade (the proven baseline).** Open the order form, enter a small
   order, and place it. It goes to Injective's on-chain order book like any perp.
3. **Shielded trade (local mode).** Expand Advanced settings, enable **Shielded**,
   and submit. The order appears in the **Sealed orders** panel as `SEALED` with a
   countdown - its side/price/size are not on the public book yet. When the reveal
   window elapses it flips to `SUBMITTED` and the real order is placed.
4. **Shielded trade (relayer mode).** With the relayer running and
   `VITE_SHIELDED_MODE=relayer`, the sealed order is sent to the relayer, which
   batches and executes it from a pooled account (dry-run prints the batch; with a
   funded key it broadcasts). See `docs/demo/relayer-dryrun.txt` for a real
   transcript of seal -> verify -> batch -> execute.
5. **Mechanism close-up.** Open `docs/demo/shielded-flow.html` in a browser (no
   setup) - a self-contained visualizer of the commit-reveal using the same
   SHA-256 commitment as the app. It shows the order hidden while sealed, then
   revealed with the integrity check `H(order || salt) == commitment`.

## Demo assets (in `docs/demo/`)

- `shielded-flow.html` - interactive commit-reveal visualizer (open in a browser).
- `03-shielded-sealed.png` - two orders SEALED, side/price/size hidden, counting down.
- `04-shielded-revealed.png` - same orders SUBMITTED, revealed, integrity verified.
- `relayer-dryrun.txt` - real relayer transcript (seal, commitment-mismatch rejected, batch execute).
- `02-futures.png` - the app booting with ZEC Perps branding (live data needs a normal network).

## Talking points (for judges' questions)

- **Why Injective, not Zcash L1?** Zcash has no smart contracts; every ZEC perp
  (Hyperliquid, Binance, etc.) is oracle-priced and settled elsewhere. Injective
  gives a proven on-chain order book and a real ZEC market already live.
- **What privacy is real?** Pre-trade secrecy (until reveal) and, in relayer mode,
  identity unlinkability under a real anonymity set. Post-trade positions stay
  public on Injective - we do not claim otherwise.
- **Isn't this just MEV protection?** No - Injective already runs an in-block
  frequent batch auction at a uniform clearing price. Our value is cross-block
  secrecy and unlinkability, not intra-block ordering.
- **Grounding.** FairTraDEX (arXiv:2202.06384), SPEEDEX (arXiv:2111.02719), Rialto
  (arXiv:2111.15259), F3B (arXiv:2205.08529); perp-specific "Reveal, Correct, Then
  Pay" (arXiv:2607.13832).
- **Roadmap.** Non-custodial authz mode, a zk proof that reveal == commitment,
  threshold-encrypted seal, and a shielded collateral pool for post-trade privacy.
