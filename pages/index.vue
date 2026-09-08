<script lang="ts" setup>
import { TradeSubPage } from '@/types'

// ZEC-only venue: land directly on the Zcash perpetual trading page instead of
// a multi-market landing page.
definePageMeta({
  middleware: [
    () =>
      navigateTo(
        { name: TradeSubPage.Futures, params: { slug: 'zec-usdt-perp' } },
        { redirectCode: 302 }
      )
  ]
})

useHead({
  bodyAttrs: {
    class: 'dark:bg-[#00001A]'
  }
})
</script>

<template>
  <div>
    <div class="max-w-7xl mx-auto w-full px-6 xs:px-8 lg:px-12 relative z-[3]">
      <PartialsHomeSectionsHero />
      <!-- Simplified homepage: removed Overview, Mobile App, Community, News, FAQ -->
    </div>
  </div>
</template>
