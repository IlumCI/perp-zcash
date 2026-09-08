import { defineStore } from 'pinia'
import {
  ShieldedMode,
  RelayerClient,
  createCommitment,
  SealedOrderStatus,
  encodeSealedPayload
} from '@/app/shielded'
import type {
  SealedOrder,
  ShieldedConfig,
  ShieldedOrderParams
} from '@/app/shielded'

const readConfig = (): ShieldedConfig => {
  const env = import.meta.env as Record<string, string | undefined>

  const mode =
    env.VITE_SHIELDED_MODE === ShieldedMode.Relayer
      ? ShieldedMode.Relayer
      : ShieldedMode.Local

  return {
    enabled: env.VITE_SHIELDED_ENABLED === 'true',
    mode,
    relayerUrl: env.VITE_RELAYER_URL || '',
    revealWindowMs: Number(env.VITE_SHIELDED_REVEAL_WINDOW_MS || 15000)
  }
}

const SHIELDED_CONFIG: ShieldedConfig = readConfig()

type ShieldedStoreState = {
  sealedOrders: SealedOrder[]
}

const initialStateFactory = (): ShieldedStoreState => ({
  sealedOrders: []
})

export const useShieldedStore = defineStore('shielded', {
  state: (): ShieldedStoreState => initialStateFactory(),
  getters: {
    config: (): ShieldedConfig => SHIELDED_CONFIG,
    isEnabled: (): boolean => SHIELDED_CONFIG.enabled,
    mode: (): ShieldedMode => SHIELDED_CONFIG.mode,
    pendingOrders: (state): SealedOrder[] =>
      state.sealedOrders.filter(
        (order) =>
          order.status === SealedOrderStatus.Sealed ||
          order.status === SealedOrderStatus.Revealing
      )
  },
  actions: {
    updateSealedOrder(id: string, patch: Partial<SealedOrder>) {
      const index = this.sealedOrders.findIndex((order) => order.id === id)

      if (index !== -1) {
        this.sealedOrders[index] = { ...this.sealedOrders[index], ...patch }
      }
    },

    /**
     * Seal an order (commit + withhold) and schedule its reveal/execution.
     *
     * `execute` performs the real on-chain submission from the trader's own
     * subaccount and is used only in local (client-side commit-reveal) mode. In
     * relayer mode the sealed order is handed to the relayer, which executes it
     * from a pooled subaccount, so `execute` is not called.
     */
    async sealAndSchedule({
      params,
      execute
    }: {
      params: ShieldedOrderParams
      execute: () => Promise<unknown>
    }): Promise<SealedOrder> {
      const config = SHIELDED_CONFIG
      const commitment = await createCommitment(params)
      const id = `${commitment.commitment.slice(0, 10)}-${Date.now()}`

      const sealedOrder: SealedOrder = {
        id,
        params,
        commitment,
        status: SealedOrderStatus.Sealed,
        revealAt: Date.now() + config.revealWindowMs,
        mode: config.mode
      }

      this.sealedOrders = [sealedOrder, ...this.sealedOrders].slice(0, 25)

      if (config.mode === ShieldedMode.Relayer && config.relayerUrl) {
        await this.sealViaRelayer(sealedOrder, config)
      } else {
        this.scheduleLocalReveal(sealedOrder, execute)
      }

      return sealedOrder
    },

    scheduleLocalReveal(order: SealedOrder, execute: () => Promise<unknown>) {
      const delay = Math.max(0, order.revealAt - Date.now())

      setTimeout(() => {
        this.updateSealedOrder(order.id, {
          status: SealedOrderStatus.Revealing
        })

        execute()
          .then((result) => {
            const txHash = (result as undefined | { txHash?: string })?.txHash

            this.updateSealedOrder(order.id, {
              status: SealedOrderStatus.Submitted,
              txHash
            })
          })
          .catch((error: unknown) => {
            this.updateSealedOrder(order.id, {
              status: SealedOrderStatus.Failed,
              error: error instanceof Error ? error.message : String(error)
            })
          })
      }, delay)
    },

    async sealViaRelayer(order: SealedOrder, config: ShieldedConfig) {
      const relayer = new RelayerClient(config.relayerUrl)

      try {
        const sealed = encodeSealedPayload(order.params, order.commitment)
        const response = await relayer.seal({
          commitment: order.commitment.commitment,
          sealed
        })

        this.updateSealedOrder(order.id, {
          batchId: response.batchId,
          revealAt: response.revealAt,
          txHash: response.anchorTxHash
        })

        this.pollRelayerOrder(order.id, response.id, config)
      } catch (error: unknown) {
        this.updateSealedOrder(order.id, {
          status: SealedOrderStatus.Failed,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    },

    pollRelayerOrder(
      localId: string,
      relayerId: string,
      config: ShieldedConfig
    ) {
      const relayer = new RelayerClient(config.relayerUrl)
      let attempts = 0

      const poll = () => {
        attempts += 1

        relayer
          .orderStatus(relayerId)
          .then((status) => {
            this.updateSealedOrder(localId, {
              status: status.status,
              txHash: status.txHash,
              error: status.error
            })

            const done =
              status.status === SealedOrderStatus.Submitted ||
              status.status === SealedOrderStatus.Failed

            if (!done && attempts <= 40) {
              setTimeout(poll, 3000)
            }
          })
          .catch(() => {
            if (attempts <= 40) {
              setTimeout(poll, 3000)
            }
          })
      }

      setTimeout(poll, 3000)
    }
  }
})
