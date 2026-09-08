/**
 * REST client for the shielded-order relayer service (see /relayer).
 *
 * Used only in ShieldedMode.Relayer. In ShieldedMode.Local the app performs a
 * client-side commit-reveal and never contacts a relayer.
 *
 * The `sealed` payload carries the reveal data (order params + salt + nonce)
 * the relayer needs to execute at the batch boundary. In this MVP it is a
 * base64 JSON blob delivered over TLS; the relayer holds it privately until the
 * reveal window closes. Removing in-window trust in the relayer (threshold /
 * committee encryption so no single party can decrypt early) is the documented
 * stretch — see the README threat model.
 */
import type {
  OrderCommitment,
  SealedOrderStatus,
  ShieldedOrderParams
} from './types'

export interface SealRequest {
  sealed: string
  commitment: string
}

export interface SealResponse {
  id: string
  batchId: string
  revealAt: number
  anchorTxHash?: string
}

export interface OrderStatusResponse {
  id: string
  error?: string
  batchId: string
  txHash?: string
  status: SealedOrderStatus
}

export const encodeSealedPayload = (
  params: ShieldedOrderParams,
  commitment: OrderCommitment
): string => {
  const payload = JSON.stringify({
    params,
    salt: commitment.salt,
    nonce: commitment.nonce
  })

  // btoa in the browser; Buffer in Node (SSR / tests).
  if (typeof btoa === 'function') {
    return btoa(payload)
  }

  return Buffer.from(payload, 'utf-8').toString('base64')
}

export class RelayerClient {
  constructor(private readonly baseUrl: string) {}

  async seal(body: SealRequest): Promise<SealResponse> {
    const res = await fetch(this.url('/seal'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      throw new Error(`relayer /seal failed with status ${res.status}`)
    }

    return res.json()
  }

  async orderStatus(id: string): Promise<OrderStatusResponse> {
    const res = await fetch(this.url(`/order/${id}`))

    if (!res.ok) {
      throw new Error(`relayer /order failed with status ${res.status}`)
    }

    return res.json()
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(this.url('/health'))

      return res.ok
    } catch {
      return false
    }
  }

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}${path}`
  }
}
