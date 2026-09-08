<script setup lang="ts">
import { JSON_POLL_INTERVAL } from '@shared/utils/constant'
import {
  ZEC_ONLY_SPOT_MARKET_MAP,
  ZEC_ONLY_DERIVATIVE_MARKET_MAP
} from '@/app/data/zcash'
import {
  swapRoutes,
  verifiedDenoms,
  spotGridMarkets,
  expiryMarketIdMap,
  marketCategoriesMap,
  restrictedCountries,
  blacklistedAddresses,
  derivativeGridMarkets,
  verifiedSpotMarketIdMap,
  verifiedDerivateMarketIdMap
} from '@/app/json'

const jsonStore = useSharedJsonStore()
const sharedWalletStore = useSharedWalletStore()

const emit = defineEmits<{
  'on:loaded': []
}>()

onMounted(() => {
  mountCachedJson()
  curateZecOnly()
  pollJson().finally(() => {
    curateZecOnly()
    emit('on:loaded')
  })
})

// ZEC-only venue: force the verified market maps down to the single Zcash perp.
// This overrides both the build-baked seed (mountCachedJson) and the upstream
// CDN refresh (pollJson), which would otherwise re-introduce every market.
function curateZecOnly() {
  jsonStore.verifiedDerivativeMarketMap = { ...ZEC_ONLY_DERIVATIVE_MARKET_MAP }
  jsonStore.verifiedSpotMarketMap = { ...ZEC_ONLY_SPOT_MARKET_MAP }
}

function pollJson() {
  return Promise.all([
    jsonStore.fetchToken(),
    jsonStore.fetchSwapRoutes(),
    jsonStore.fetchSpotGridMarkets(),
    jsonStore.fetchExpiryMarketMap(),
    jsonStore.fetchChainUpgradeConfig(),
    jsonStore.fetchMarketCategoryMap(),
    jsonStore.fetchRestrictedCountries(),
    jsonStore.fetchBlacklistedAddresses(),
    jsonStore.fetchVerifiedSpotMarketMap(),
    jsonStore.fetchDerivativeGridMarkets(),
    sharedWalletStore.fetchWeb3GatewayStatus(),
    jsonStore.fetchVerifiedDerivativeMarketMap()
  ])
}

function mountCachedJson() {
  jsonStore.fetchFullTokenList()

  jsonStore.swapRoutes = swapRoutes.map((route) => ({
    ...route,
    sourceDenom: route.source_denom,
    targetDenom: route.target_denom
  }))

  jsonStore.verifiedDenoms = verifiedDenoms
  jsonStore.spotGridMarkets = spotGridMarkets
  jsonStore.expiryMarketMap = expiryMarketIdMap
  jsonStore.restrictedCountries = restrictedCountries
  jsonStore.helixMarketCategory = marketCategoriesMap
  jsonStore.blacklistedAddresses = blacklistedAddresses
  jsonStore.derivativeGridMarkets = derivativeGridMarkets
  jsonStore.verifiedSpotMarketMap = verifiedSpotMarketIdMap
  jsonStore.verifiedDerivativeMarketMap = verifiedDerivateMarketIdMap
}

useIntervalFn(() => pollJson().finally(curateZecOnly), JSON_POLL_INTERVAL) // 10 mins
</script>

<template>
  <div />
</template>
