import { config } from './config'
import { ledger } from './ledger'
import { executeOrder } from './executor'
import { SealedOrderStatus } from './types'

/**
 * Closes each batch once its reveal window elapses, then reveals and executes
 * every order in it. Orders sealed in the same window execute together, so no
 * single order's side/price is observable before the batch reveals.
 */
export function startBatchScheduler(): void {
  const tick = async () => {
    const due = ledger.batchesDue(Date.now())

    for (const batch of due) {
      ledger.closeBatch(batch.id)
      const orders = ledger.ordersOf(batch)

      for (const order of orders) {
        ledger.updateOrder(order.id, { status: SealedOrderStatus.Revealing })

        try {
          const { txHash } = await executeOrder(order)
          ledger.updateOrder(order.id, {
            status: SealedOrderStatus.Submitted,
            txHash
          })
          console.log(
            `[batch ${batch.id.slice(0, 8)}] executed ${order.id.slice(
              0,
              8
            )} tx=${txHash}`
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          ledger.updateOrder(order.id, {
            status: SealedOrderStatus.Failed,
            error: message
          })
          console.error(
            `[batch ${batch.id.slice(0, 8)}] ${order.id.slice(
              0,
              8
            )} failed: ${message}`
          )
        }
      }
    }
  }

  const interval = Math.max(1000, Math.floor(config.revealWindowMs / 3))
  setInterval(() => void tick(), interval)
}
