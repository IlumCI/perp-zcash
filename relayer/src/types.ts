export enum SealedOrderStatus {
  Sealed = 'sealed',
  Revealing = 'revealing',
  Submitted = 'submitted',
  Failed = 'failed'
}

export interface ShieldedOrderParams {
  slug: string
  side: string
  price: string
  margin: string
  marketId: string
  quantity: string
  reduceOnly: boolean
}

/** Reveal payload the client seals (base64) and the relayer decodes at reveal. */
export interface RevealPayload {
  salt: string
  nonce: string
  params: ShieldedOrderParams
}

export interface RelayerOrder {
  id: string
  error?: string
  batchId: string
  txHash?: string
  revealAt: number
  commitment: string
  receivedAt: number
  reveal: RevealPayload
  anchorTxHash?: string
  status: SealedOrderStatus
}

export interface Batch {
  id: string
  opensAt: number
  closed: boolean
  closesAt: number
  orderIds: string[]
}
