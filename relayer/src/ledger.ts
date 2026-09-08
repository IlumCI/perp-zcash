import { config } from './config'
import { randomUUID } from 'node:crypto'
import { SealedOrderStatus } from './types'
import type { Batch, RelayerOrder, RevealPayload } from './types'

/**
 * In-memory ledger of sealed orders and batches. A production relayer would
 * persist this (and per-trader collateral accounting for the omnibus model) to
 * a durable store; for the prototype an in-memory map keeps the moving parts
 * obvious.
 */
class Ledger {
  private orders = new Map<string, RelayerOrder>()
  private batches = new Map<string, Batch>()
  private openBatchId: null | string = null

  currentBatch(): Batch {
    const now = Date.now()
    const open = this.openBatchId ? this.batches.get(this.openBatchId) : undefined

    if (open && !open.closed) {
      return open
    }

    const batch: Batch = {
      id: randomUUID(),
      opensAt: now,
      closesAt: now + config.revealWindowMs,
      orderIds: [],
      closed: false
    }

    this.batches.set(batch.id, batch)
    this.openBatchId = batch.id

    return batch
  }

  addOrder(commitment: string, reveal: RevealPayload): RelayerOrder {
    const batch = this.currentBatch()

    const order: RelayerOrder = {
      id: randomUUID(),
      batchId: batch.id,
      commitment,
      reveal,
      status: SealedOrderStatus.Sealed,
      receivedAt: Date.now(),
      revealAt: batch.closesAt
    }

    this.orders.set(order.id, order)
    batch.orderIds.push(order.id)

    return order
  }

  closeBatch(id: string): void {
    const batch = this.batches.get(id)

    if (batch) {
      batch.closed = true
    }

    if (this.openBatchId === id) {
      this.openBatchId = null
    }
  }

  updateOrder(id: string, patch: Partial<RelayerOrder>): void {
    const order = this.orders.get(id)

    if (order) {
      this.orders.set(id, { ...order, ...patch })
    }
  }

  ordersOf(batch: Batch): RelayerOrder[] {
    return batch.orderIds
      .map((id) => this.orders.get(id))
      .filter((order): order is RelayerOrder => Boolean(order))
  }

  batchesDue(now: number): Batch[] {
    return [...this.batches.values()].filter(
      (batch) => !batch.closed && batch.closesAt <= now
    )
  }

  getOrder(id: string): undefined | RelayerOrder {
    return this.orders.get(id)
  }

  allBatches(): Batch[] {
    return [...this.batches.values()]
  }
}

export const ledger = new Ledger()
