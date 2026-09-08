import { TradePage, TradeSubPage } from './../../types/page'
import { ZEC_ONLY_DERIVATIVE_MARKET_MAP } from './../../app/data/zcash'
import type { NitroConfig } from 'nitropack'
import type { NuxtHooks } from 'nuxt/schema'

export default {
  'pages:extend'(pages) {
    const spotPage = pages.find((page) => page.name === TradePage.Spot)
    const futuresPage = pages.find((page) => page.name === TradePage.Futures)

    if (futuresPage) {
      pages.push({
        ...futuresPage,
        path: '/futures/stocks',
        name: TradeSubPage.Stocks
      })

      pages.push({
        ...futuresPage,
        path: '/futures/:slug()',
        name: TradeSubPage.Futures
      })
    }

    if (spotPage) {
      pages.push({
        ...spotPage,
        path: '/spot/:slug()',
        name: TradeSubPage.Spot
      })
    }
  },
  'nitro:config'(nitroConfig: NitroConfig) {
    if (
      nitroConfig.dev ||
      !nitroConfig.prerender ||
      !nitroConfig.prerender.routes
    ) {
      return
    }

    // ZEC-only venue: prerender only the Zcash perp route (no spot, no other perps).
    nitroConfig.prerender.routes = [
      ...nitroConfig.prerender.routes,
      ...Object.keys(ZEC_ONLY_DERIVATIVE_MARKET_MAP).map((s) => `/futures/${s}`)
    ]
  }
} as NuxtHooks
