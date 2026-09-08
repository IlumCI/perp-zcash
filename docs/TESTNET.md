# Testnet validation (M1: real shielded execution)

Goal: validate the relayer's **real** on-chain execution (`DRY_RUN=false`) on
Injective **testnet** with a funded key, before pointing at the mainnet ZEC perp.
ZEC has no testnet market, so validate the mechanics against an existing testnet
perp; only `MARKET_ID` differs for mainnet ZEC.

Testnet market used here: `inj-usdt-perp`
`0x17ef48032cb24375ba7c2e39f384e56433bcab20cbee9a7357e4cba2eb00abe6`
(chain `injective-888`). INJ is easy to get from the faucet.

## 1. Get testnet funds

- Faucet: https://testnet.faucet.injective.network/ (INJ + testnet USDT).
- You need INJ for gas and USDT for perp margin. Claim a few times if needed.

## 2. Fund the relayer's exchange subaccount

The relayer places orders from its subaccount, which needs USDT **deposited into
the exchange** (bank balance is not margin). Easiest path: import the relayer key
into a wallet, open the app on testnet, and Deposit USDT; or use `injectived`:

```bash
injectived tx exchange deposit <amount>peggy0x...USDT \
  --from <relayer-key> --chain-id injective-888 \
  --node https://testnet.sentry.tm.injective.network:443 --yes
```

## 3. Configure the relayer for testnet

```bash
cd relayer && cp .env.example .env
```
Set in `relayer/.env`:
```
NETWORK=testnet
MARKET_ID=0x17ef48032cb24375ba7c2e39f384e56433bcab20cbee9a7357e4cba2eb00abe6
QUOTE_DECIMALS=6
REVEAL_WINDOW_MS=10000
DRY_RUN=false
RELAYER_PRIVATE_KEY=<funded testnet private key hex, no 0x>
RELAYER_SUBACCOUNT_INDEX=0
```
Security: use a dedicated testnet key holding only test funds.

## 4. Run and validate

```bash
cd relayer && npm install && npm start
curl localhost:8888/health   # expect dryRun:false, network:testnet
```

Seal a test order (relayer executes on its configured MARKET_ID; the sealed
`params` only feed the commitment). Use a seal script like the one in
`docs/demo` / the app's shielded client, with order params sane for the market
(a limit price near mark, quantity above the market's min notional). Then:

```bash
curl localhost:8888/order/<id>   # sealed -> revealing -> submitted (real txHash)
```

Verify the resulting order/trade on the testnet explorer
(https://testnet.explorer.injective.network/) under the relayer address.

Full-UI path (optional): set the app to testnet (`VITE_NETWORK=testnet`,
`VITE_SHIELDED_MODE=relayer`, `VITE_RELAYER_URL=...`) and temporarily point the
ZEC-only allowlist (`app/data/zcash.ts`) at the testnet market id so the form
renders, then place a shielded order from the UI.

## 5. Troubleshooting (expected first-run issues)

- `ErrInvalidOracle` / market not found: wrong `MARKET_ID` for the network.
- Insufficient margin / balance: deposit more USDT into the subaccount (step 2).
- Min-notional rejection: increase order quantity/price so notional clears the
  market minimum.
- Message-shape errors from the SDK: the executor builds
  `MsgCreateDerivativeLimitOrder` via `@injectivelabs/sdk-ts`; if your SDK version
  differs, adjust `relayer/src/executor.ts` (price/quantity/margin scaling,
  `subaccountId`, `feeRecipient`). Report the exact error and we will pin it.
- Subaccount id: index 0 is the default subaccount of the relayer address; if the
  SDK's `getSubaccountId` is unavailable it is derived as `0x<ethAddr><index>`.

## 6. Go to mainnet ZEC

Once validated on testnet, set `NETWORK=mainnet` and
`MARKET_ID=0xef0dd633da52cfc21db866b05463c8b43c02265b86bf9257a5d39848cd2eea11`
(the live ZEC/USDT perp). Keep the custodial omnibus off real user funds until
audited (ROADMAP M5); prefer the non-custodial authz mode for real users.
