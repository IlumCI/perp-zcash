# ZEC Perps — Shielded-order relayer

A small service that accepts **sealed** ZEC-perp orders, batches them, anchors
their commitments, and at each reveal window executes them against Injective's
ZEC/USDT perpetual. It is the component that turns the app's client-side
commit-reveal into a **dark-pool-style batch** with **identity unlinkability**
(orders execute from a pooled/omnibus account, not the trader's wallet).

It is a **prototype**. Read the privacy boundary below before claiming anything.

## What it does

1. `POST /seal { commitment, sealed }` — the app sends a SHA-256 `commitment`
   and a base64 reveal payload (`{ params, salt, nonce }`). The relayer verifies
   `sha256(canonical(params) || salt || nonce) == commitment`, assigns the order
   to the currently open batch, and (optionally) anchors the commitment on-chain.
2. At the batch's reveal time the relayer reveals every order in the batch and
   submits them together to Injective, so no single order's side/price/size was
   observable on the public book beforehand.
3. `GET /order/:id` — lifecycle: `sealed → revealing → submitted | failed`.

Injective already matches each block's orders in a **frequent batch auction at a
uniform clearing price**, so intra-block ordering MEV is handled by the venue.
What this relayer adds is **cross-block pre-trade secrecy** (a resting order is
not on the public book during the seal window) and **identity unlinkability**
(execution from an omnibus account).

## Run it

```bash
cd relayer
cp .env.example .env
npm install
npm start          # dry-run by default: no funds, no broadcast
```

Then, from the app, set `VITE_SHIELDED_MODE=relayer` and
`VITE_RELAYER_URL=http://localhost:8888`.

Quick manual check:

```bash
curl localhost:8888/health
# seal a dummy order (commitment must match the sealed payload; the app does this for you)
curl localhost:8888/batches
```

### Dry-run vs real execution

- `DRY_RUN=true` (default): the full seal → batch → reveal → "execute" lifecycle
  runs, commitments are verified, but **nothing is broadcast**. Ideal for demos.
- `DRY_RUN=false`: set `RELAYER_PRIVATE_KEY` (a dedicated hot key funded with the
  USDT you are willing to pool) and the relayer submits real
  `MsgCreateDerivativeLimitOrder`s from its omnibus subaccount. Validate the
  message shape against your installed `@injectivelabs/sdk-ts` first.

### On-chain anchor

`ANCHOR_MODE=memo` broadcasts a self-transfer whose tx memo carries the
commitment, giving a public, timestamped, tamper-evident record that the order
existed before reveal. `none` (default) skips it. A CosmWasm anchor contract
(testnet only — mainnet CosmWasm upload is governance-gated) lives in
`../contracts/anchor`.

## Privacy boundary (do not overclaim)

- **Pre-trade secrecy** — real, for the seal window only. At reveal the order
  becomes a normal, public Injective order. The relayer sees plaintext during
  the window; removing that trust needs threshold/committee encryption so no
  single party can decrypt early (stretch — F3B / Shutter / batched-TE).
- **Identity unlinkability** — real only under conditions: several concurrent
  traders per batch, pooled/fixed-size deposits (else deposit/withdraw
  amounts+timing correlate), an honest-but-curious relayer, and no address/IP
  reuse. A single-trader batch is trivially linkable → pseudonymity, not
  anonymity.
- **Post-trade position privacy** — NOT provided. Positions, funding and
  liquidations are public per subaccount on Injective; the omnibus hides *which
  trader*, but its aggregate net position and liquidation level are public.
  Real per-trader post-trade privacy needs a shielded collateral pool with
  zk-accounted balances (Penumbra/Rialto-style) — out of scope for this
  prototype.
- **Custody / trust** — in the omnibus model the relayer holds pooled collateral
  and can censor, reorder, or lose funds. The authz variant (grant the relayer
  authority to trade on the trader's own subaccount) removes custody but also
  removes unlinkability. Single-relayer = single point of failure, no liveness
  guarantee.

## References

Sealed-batch / fair-ordering and encrypted-mempool designs this borrows from:
FairTraDEX (arXiv:2202.06384), SPEEDEX (arXiv:2111.02719), Rialto
(arXiv:2111.15259), F3B threshold mempool (arXiv:2205.08529), and the
perp-specific caveat "Reveal, Correct, Then Pay" (arXiv:2607.13832) — sealing
order flow delays funding-rate correction, which matters on a perp venue.
