<script setup lang="ts">
import { SealedOrderStatus } from '@/app/shielded'

const shieldedStore = useShieldedStore()

const now = ref(Date.now())

useIntervalFn(() => {
  now.value = Date.now()
}, 1000)

function secondsLeft(revealAt: number): number {
  return Math.max(0, Math.ceil((revealAt - now.value) / 1000))
}

function statusClass(status: SealedOrderStatus): string {
  switch (status) {
    case SealedOrderStatus.Submitted:
      return 'text-green-500'
    case SealedOrderStatus.Revealing:
      return 'text-blue-400'
    case SealedOrderStatus.Failed:
      return 'text-red-500'
    default:
      return 'text-gray-400'
  }
}
</script>

<template>
  <div
    v-if="shieldedStore.isEnabled && shieldedStore.sealedOrders.length"
    class="mt-3 rounded-md border border-brand-700 p-2"
  >
    <p class="text-xs font-semibold text-white mb-1">
      {{ $t('trade.shielded.sealedOrders') }}
    </p>

    <div
      v-for="order in shieldedStore.sealedOrders"
      :key="order.id"
      class="flex items-center justify-between gap-2 py-0.5 text-xs"
    >
      <span class="font-mono text-gray-400">
        {{ order.commitment.commitment.slice(0, 10) }}…
      </span>
      <span class="uppercase text-gray-300">{{ order.params.side }}</span>
      <span
        v-if="order.status === SealedOrderStatus.Sealed"
        class="text-gray-400"
      >
        {{ $t('trade.shielded.revealIn', { s: secondsLeft(order.revealAt) }) }}
      </span>
      <span v-else :class="statusClass(order.status)">
        {{ $t(`trade.shielded.status.${order.status}`) }}
      </span>
    </div>
  </div>
</template>
