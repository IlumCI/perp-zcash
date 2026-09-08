import type { TradeDirection } from '@injectivelabs/ts-types'

/**
 * Execution mode for a shielded (sealed) order.
 *
 * - Local: client-side commit-reveal. The order is committed and withheld in
 *   the browser for a reveal window, then submitted from the trader's own
 *   subaccount. Provides pre-trade secrecy (the order is not on the public book
 *   during the window) but NOT identity unlinkability. No relayer required.
 * - Relayer: the sealed order is sent to an external relayer that batches,
 *   anchors, reveals and executes it from a pooled (omnibus) subaccount,
 *   adding identity unlinkability. Requires a running relayer (see /relayer).
 */
export enum ShieldedMode {
  Local = 'local',
  Relayer = 'relayer'
}

export enum SealedOrderStatus {
  Sealed = 'sealed',
  Revealing = 'revealing',
  Submitted = 'submitted',
  Failed = 'failed'
}

/** The order fields bound by a commitment (stringified for hashing/display). */
export interface ShieldedOrderParams {
  slug: string
  price: string
  margin: string
  marketId: string
  quantity: string
  reduceOnly: boolean
  side: TradeDirection
}

export interface OrderCommitment {
  /** Hex random salt, revealed at execution so anyone can verify. */
  salt: string
  nonce: string
  createdAt: number
  /** Hex SHA-256 digest published during the seal window. */
  commitment: string
}

export interface SealedOrder {
  id: string
  error?: string
  txHash?: string
  revealAt: number
  batchId?: string
  mode: ShieldedMode
  status: SealedOrderStatus
  params: ShieldedOrderParams
  commitment: OrderCommitment
}

export interface ShieldedConfig {
  enabled: boolean
  mode: ShieldedMode
  relayerUrl: string
  revealWindowMs: number
}
