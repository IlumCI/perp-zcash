import { createHash } from 'node:crypto'
import type { RevealPayload, ShieldedOrderParams } from './types'

/**
 * Must match the client's canonicalization exactly (app/shielded/commitment.ts)
 * — same field order, same JSON — or verification will fail.
 */
export const canonicalizeOrder = (
  params: ShieldedOrderParams,
  salt: string,
  nonce: string
): string =>
  JSON.stringify({
    marketId: params.marketId,
    side: params.side,
    price: params.price,
    quantity: params.quantity,
    margin: params.margin,
    reduceOnly: params.reduceOnly,
    salt,
    nonce
  })

export const sha256Hex = (input: string): string =>
  createHash('sha256').update(input, 'utf8').digest('hex')

export const verifyCommitment = (
  reveal: RevealPayload,
  commitment: string
): boolean =>
  sha256Hex(canonicalizeOrder(reveal.params, reveal.salt, reveal.nonce)) ===
  commitment
