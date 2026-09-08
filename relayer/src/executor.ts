import { config } from './config'
import { verifyCommitment } from './commitment'
import type { RelayerOrder } from './types'

/**
 * On-chain execution + anchoring against Injective.
 *
 * The Injective SDK is loaded dynamically and typed loosely on purpose: the
 * default DRY_RUN path never touches it (so the relayer runs with no deps on a
 * funded key), and the real path is opt-in. Validate the exact message shape
 * against your installed @injectivelabs/sdk-ts version before going live.
 */
let chain: null | {
  sdk: any
  address: string
  broadcaster: any
  subaccountId: string
} = null

async function getChain() {
  if (chain) {
    return chain
  }

  if (!config.relayerPrivateKey) {
    throw new Error('RELAYER_PRIVATE_KEY is required when DRY_RUN=false')
  }

  const sdk: any = await import('@injectivelabs/sdk-ts')
  const net: any = await import('@injectivelabs/networks')

  const network =
    config.network === 'testnet' ? net.Network.Testnet : net.Network.Mainnet
  const privateKey = sdk.PrivateKey.fromHex(config.relayerPrivateKey)
  const address: string = privateKey.toBech32()
  const ethAddress: string = privateKey.toAddress().toHex().replace(/^0x/, '')
  const index = config.relayerSubaccountIndex.toString(16).padStart(24, '0')

  const subaccountId =
    typeof sdk.getSubaccountId === 'function'
      ? sdk.getSubaccountId(address, config.relayerSubaccountIndex)
      : `0x${ethAddress}${index}`

  const broadcaster = new sdk.MsgBroadcasterWithPk({
    privateKey: config.relayerPrivateKey,
    network
  })

  chain = { sdk, address, subaccountId, broadcaster }

  console.log(`executor: relayer address=${address}`)
  console.log(`executor: omnibus subaccountId=${subaccountId} (fund USDT here)`)

  return chain
}

/** Post the commitment on-chain (self-transfer whose memo carries the hash). */
export async function anchorCommitment(
  commitment: string
): Promise<string | undefined> {
  if (config.anchorMode !== 'memo') {
    return undefined
  }

  if (config.dryRun) {
    return `dry-run-anchor:${commitment.slice(0, 8)}`
  }

  const { sdk, address, broadcaster } = await getChain()

  const msg = sdk.MsgSend.fromJSON({
    amount: { denom: 'inj', amount: '1' },
    srcInjectiveAddress: address,
    dstInjectiveAddress: address
  })

  const res = await broadcaster.broadcast({
    msgs: msg,
    memo: `zecperps:commit:${commitment}`
  })

  return res.txHash
}

/** Verify the reveal against the commitment, then submit the real order. */
export async function executeOrder(
  order: RelayerOrder
): Promise<{ txHash: string }> {
  if (!verifyCommitment(order.reveal, order.commitment)) {
    throw new Error('commitment verification failed at reveal')
  }

  const { params } = order.reveal

  if (config.dryRun) {
    return { txHash: `dry-run:${order.commitment.slice(0, 12)}` }
  }

  const { sdk, address, subaccountId, broadcaster } = await getChain()

  const orderType =
    params.side === 'long' ? sdk.OrderSide.Buy : sdk.OrderSide.Sell

  const price = sdk.derivativePriceToChainPriceToFixed({
    value: params.price,
    quoteDecimals: config.quoteDecimals
  })
  const quantity = sdk.derivativeQuantityToChainQuantityToFixed({
    value: params.quantity
  })
  const margin = params.reduceOnly
    ? '0'
    : sdk.derivativeMarginToChainMarginToFixed({
        value: params.margin,
        quoteDecimals: config.quoteDecimals
      })

  const msg = sdk.MsgCreateDerivativeLimitOrder.fromJSON({
    injectiveAddress: address,
    subaccountId,
    marketId: config.marketId,
    orderType,
    price,
    quantity,
    margin,
    triggerPrice: '0',
    feeRecipient: address,
    reduceOnly: params.reduceOnly
  })

  const res = await broadcaster.broadcast({ msgs: msg })

  return { txHash: res.txHash }
}
