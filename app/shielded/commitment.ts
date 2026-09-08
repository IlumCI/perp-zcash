/**
 * Order commitment for the shielded (sealed-order) flow.
 *
 * The commitment is a binding, hiding hash of the order parameters plus a
 * random salt. Only the commitment is published (on-chain and/or to the
 * relayer) during the seal window; the plaintext order + salt are revealed at
 * execution, at which point anyone can verify that H(order || salt) equals the
 * previously published commitment.
 *
 * The MVP uses SHA-256 via the Web Crypto API — no dependency, available in
 * both the browser and Node. A zk-friendly hash (Poseidon) is the upgrade path
 * for the SNARK milestone, where the trader additionally proves, in
 * zero-knowledge, that the revealed order matches the commitment (and, as a
 * stretch, that they hold sufficient collateral) — see the README.
 */
import type { OrderCommitment, ShieldedOrderParams } from './types'

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

const randomHex = (numBytes: number): string => {
  const bytes = new Uint8Array(numBytes)
  crypto.getRandomValues(bytes)

  return toHex(bytes)
}

/** Deterministic serialization of the fields bound by a commitment. */
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

export const sha256Hex = async (input: string): Promise<string> => {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)

  return toHex(new Uint8Array(digest))
}

/** Build a hiding + binding commitment to an order. */
export const createCommitment = async (
  params: ShieldedOrderParams
): Promise<OrderCommitment> => {
  const salt = randomHex(32)
  const nonce = randomHex(16)
  const commitment = await sha256Hex(canonicalizeOrder(params, salt, nonce))

  return { commitment, salt, nonce, createdAt: Date.now() }
}

/** Verify that a revealed order matches a previously published commitment. */
export const verifyCommitment = async (
  params: ShieldedOrderParams,
  commitment: OrderCommitment
): Promise<boolean> => {
  const recomputed = await sha256Hex(
    canonicalizeOrder(params, commitment.salt, commitment.nonce)
  )

  return recomputed === commitment.commitment
}
