# ZEC Perps - roadmap

A staged path from the shipped MVP to a genuinely private, decentralized ZEC
perpetual venue. Each milestone is independently shippable and moves one
specific privacy or robustness property from "not provided" to "real". The
guiding principle is unchanged: the venue stays Injective's proven on-chain
order book; we add privacy as layers in front of it, and we never overclaim.

Legend - effort: S = a few days, M = 1-2 weeks, L = 3-6 weeks, XL = multi-month.
Status: Shipped / Next / Planned / Research.

Privacy scorecard (target per milestone):

| Property | M0 (now) | M1 | M2 | M3 | M4 |
|---|---|---|---|---|---|
| Pre-trade secrecy | partial (local/dry-run) | yes | yes + verifiable | yes, trustless | yes |
| Integrity of reveal | recompute hash | recompute hash | zk-proven | zk-proven | zk-proven |
| Identity unlinkability | no | omnibus (conditional) | omnibus | omnibus | pool |
| Relayer in-window trust | trusted | trusted | trusted | removed | removed |
| Post-trade position privacy | no | no | no | no | yes |

---

## M0 - Shipped (baseline)

Status: Shipped. Effort: done.

- ZEC-only venue on Injective mainnet (real ZEC/USDT perp `0xef0dd633...eea11`),
  minimal rebrand, ZEC-only routing/selectors/prerender.
- Shielded MVP: SHA-256 commit-reveal client (`app/shielded`, `store/shielded`),
  local mode (client-side reveal) and a relayer service (`relayer/`) with a
  dry-run seal -> verify -> batch -> execute lifecycle; memo anchor (mainnet) and
  a CosmWasm anchor contract (`contracts/anchor/`, testnet).
- Docs, web-session hook, demo assets (`DEMO.md`, `docs/demo/`).

Gap this leaves: no live on-chain execution of sealed orders; relayer is trusted;
no zk; no post-trade privacy. M1-M4 close these in order.

---

## M1 - Live execution and non-custodial mode

Status: Next. Effort: M. Depends on: M0.

Goal: sealed orders actually execute on Injective, in both a pooled and a
self-custody variant.

Scope:
- Validate the relayer's real path (`DRY_RUN=false`) against Injective testnet
  with a funded omnibus key: `MsgCreateDerivativeLimitOrder` message shape,
  price/quantity/margin chain-scaling, subaccountId derivation.
- Per-trader off-chain ledger + deposit/withdraw for the omnibus
  (`MsgDeposit`/`MsgExternalTransfer`/`MsgWithdraw`); signed receipts.
- Non-custodial variant: trader `MsgGrant`s the relayer authority to place the
  order on the trader's own subaccount, executed via `MsgExec` at reveal
  (`MsgGrant`/`MsgExec`/`MsgRevoke`). UI toggle exposing the custody vs
  unlinkability trade-off.
- Deploy the CosmWasm anchor to testnet and wire `ANCHOR_MODE`; keep the mainnet
  memo anchor.

Acceptance: a sealed ZEC order executes on Injective testnet from the omnibus AND
via authz; the commitment is recorded on-chain and verifiable against the reveal.

Risks: SDK message-shape drift; testnet faucet/funding; oracle freshness at
execution. Mitigation: pin SDK, add a keep-alive price check before submit.

---

## M2 - Verifiable integrity (zk reveal == commitment)

Status: Planned. Effort: M-L. Depends on: M1.

Goal: prove, in zero knowledge, that the revealed order equals the commitment and
is a member of the anchored batch - so integrity no longer relies on trusting the
relayer's recompute.

Scope:
- Move the commitment hash to a zk-friendly hash (Poseidon) shared by client and
  circuit; keep a compatibility path for the SHA-256 MVP.
- Circuit: "revealed order opens the commitment" and "commitment is a leaf of the
  anchored batch Merkle root". Toolchain: Noir + UltraHonk (`bb.js`) preferred (no
  trusted setup, fast browser proving) or circom + snarkjs (Groth16).
- Verify proofs in the relayer, and optionally in the anchor contract.

Acceptance: client attaches a proof at reveal; relayer/contract rejects invalid
proofs; in-browser proving time measured and acceptable (target < a few seconds).

Grounding: Merkle inclusion + Poseidon; Noir/UltraHonk vs Groth16 trade-offs.

---

## M3 - Trustless sealing (threshold-encrypted mempool)

Status: Planned. Effort: L. Depends on: M1 (independent of M2).

Goal: remove the relayer's ability to see order plaintext during the seal window,
closing the in-window front-running surface.

Scope:
- Encrypt sealed orders to an n-of-m committee (threshold / delayed encryption)
  so no single party can decrypt before the batch closes; decrypt at reveal.
- Options: Shutter-style IBE, batched threshold encryption, or a delay/timelock
  scheme. Evaluate committee liveness and DKG cost.
- Investigate a Cosmos/Injective-native route (threshold decryption via vote
  extensions / ABCI 2.0-style hooks) vs an off-chain committee.

Acceptance: the relayer cannot read a sealed order's side/price/size before the
reveal window closes; the committee decrypts at the boundary; liveness under one
faulty committee member.

Grounding: F3B (2205.08529), Shutter, batched threshold encryption (USENIX Sec
2024; eprints 2024/669, 2024/1516, 2024/1533), BEAST/BEAT-MEV (2025).

Risks: committee liveness and key management; added latency to the reveal.

---

## M4 - Post-trade privacy (shielded collateral pool + zk accounting)

Status: Research. Effort: XL. Depends on: M2 (needs zk), benefits from M3.

Goal: the genuinely novel end state - hide per-trader positions, margin, PnL and
liquidations, not just pre-trade order details. This is the "no ZEC private perp
exists" opening.

Scope:
- A shielded pool holds one netted on-chain position for the whole pool; each
  trader's margin/PnL lives as private notes (commitments + nullifiers) with:
  - a zk solvency proof ("my margin >= required for this order") without revealing
    the balance;
  - private balance updates on fills/funding;
  - a fair way to socialize funding and liquidation without revealing who was
    liquidated.
- Handle the perp-specific reaction gap: sealed flow delays funding-rate
  correction, so funding/liquidation params must tolerate it.

Acceptance: individual positions/PnL are not derivable on-chain; pool solvency is
provable; funding and liquidation are correct and fair under privacy.

Grounding: Penumbra (shielded pool + ZSwap batch auctions), Rialto (2111.15259,
homomorphic commitments + oblivious shuffle), zkFi (2307.00521); perp caveat
"Reveal, Correct, Then Pay" (2607.13832); ADL design (2512.01112).

Risks: highest. Likely needs a dedicated zk engineering effort and may require
Injective-side primitives or a co-processor/app-chain. Sequence last.

---

## M5 - Decentralization and production hardening

Status: Planned. Effort: XL. Depends on: M1 (ongoing alongside M2-M4).

Goal: remove single points of failure and make it production-grade.

Scope:
- Multiple relayers / a sequencer set so no single relayer can censor or halt;
  on-chain fair-ordering for the sealed layer (batch clearing at a uniform price).
- Insurance fund / auto-deleveraging for the shielded pool.
- Security audits (contracts, relayer, circuits), monitoring, key management.
- Mainnet CosmWasm anchor via a governance `wasm-store` proposal.

Acceptance: no single relayer can censor; documented threat model closed; audited.

Grounding: SPEEDEX (2111.02719), FairTraDEX (2202.06384), ADL (2512.01112), SoK
MEV (2212.05111).

---

## Parallel tracks (independent of the M-line)

- **P1 - Native ZEC funding rail (Effort: M).** Let users fund with real ZEC and
  auto-swap to USDT margin via NEAR Intents / Zashi Swaps / THORChain (transparent
  ZEC today; shielded under evaluation). Adds a Zcash-native on-ramp story.
- **P2 - Multi-asset expansion (Effort: S-M).** The ZEC-only curation is a small,
  reversible layer (`app/data/zcash.ts` + `JsonPoll.vue`); relaxing it re-enables
  other Injective markets if a broader venue is wanted later.
- **P3 - Real trader/UX polish (Effort: S).** Persist sealed orders across
  reloads, richer sealed-order status, and a wallet-connected end-to-end mainnet
  walkthrough for the demo.

---

## Sequencing

```
M0 (done) --> M1 --> M2 --> M4
                \--> M3 --------^   (M3 independent of M2; both feed M4)
              M5 runs alongside M2-M4; P1/P2/P3 anytime.
```

Recommended next: M1 (makes the demo real end-to-end), then M2 (verifiable
integrity is the highest credibility-per-effort zk step), then M3, with M4 as the
flagship research goal once M2's zk toolchain is in place.
