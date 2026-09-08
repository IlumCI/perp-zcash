<script setup lang="ts">
import { DerivativesTradeFormField } from '@/types'

const shieldedStore = useShieldedStore()

const { value: shielded } = useBooleanField({
  rule: '',
  name: DerivativesTradeFormField.Shielded,
  initialValue: false
})
</script>

<template>
  <div v-if="shieldedStore.isEnabled" class="mt-1">
    <AppCheckbox v-model="shielded" class="text-white">
      {{ $t('trade.shielded.label') }}
    </AppCheckbox>

    <p v-if="shielded" class="text-xs text-gray-400 mt-1 ml-1">
      {{ $t(`trade.shielded.${shieldedStore.mode}Hint`) }}
    </p>
  </div>
</template>
