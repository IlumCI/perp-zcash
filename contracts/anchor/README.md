# ZEC Perps — commitment anchor (CosmWasm)

A minimal CosmWasm contract that records order **commitments** on-chain so the
shielded flow is auditable: a commitment is stored when an order is sealed and
marked revealed when its batch executes. Because the commitment is on-chain and
timestamped before reveal, a relayer cannot silently withhold or fabricate
orders without it being detectable.

## Why testnet

Uploading CosmWasm code to **Injective mainnet is governance-gated**
(`MsgStoreCode` needs a passed proposal), so this contract targets **Injective
testnet** (`injective-888`, permissionless instantiate). On mainnet the relayer
falls back to a **zero-deploy `memo` anchor** (a self-transfer whose tx memo
carries the commitment) — see `../../relayer`.

## Messages

- `StoreCommitment { hash, batch_id }` — record a sealed order's SHA-256 hash.
- `Reveal { hash }` — mark it revealed at batch execution.
- Query `Commitment { hash } -> Option<CommitmentRecord>`.

## Build

Requires the Rust wasm toolchain:

```bash
rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown
# optimize for on-chain size (produces artifacts/zec_perps_anchor.wasm):
docker run --rm -v "$(pwd)":/code cosmwasm/optimizer:0.16.0
```

## Deploy to Injective testnet

```bash
injectived tx wasm store artifacts/zec_perps_anchor.wasm \
  --from <key> --chain-id injective-888 \
  --node https://testnet.sentry.tm.injective.network:443 \
  --gas auto --gas-adjustment 1.3 --yes

# instantiate (code id from the store tx)
injectived tx wasm instantiate <code_id> '{}' \
  --label zec-perps-anchor --from <key> --chain-id injective-888 \
  --node https://testnet.sentry.tm.injective.network:443 \
  --no-admin --gas auto --gas-adjustment 1.3 --yes
```

Then set the relayer's `ANCHOR_MODE` and contract address wiring accordingly.

## Scope

Prototype. It records commitments; it does not verify SNARK proofs. The
zk-proof-of-commitment milestone (prove `reveal == commitment`, then a shielded
solvency proof) would add a verify entry point here — see the top-level README.
