/**
 * ZEC-only venue configuration.
 *
 * This venue is curated down to a single Zcash (ZEC) perpetual market that
 * already exists on Injective mainnet. The market and token are served by the
 * upstream Injective registry (injective-lists); we only restrict which markets
 * the UI surfaces as "verified", and default routing to the ZEC market.
 *
 * Market: ZEC/USDT PERP on Injective mainnet.
 *   slug     : zec-usdt-perp
 *   marketId : 0xef0dd633da52cfc21db866b05463c8b43c02265b86bf9257a5d39848cd2eea11
 *   oracle   : ZEC/USD (Pyth), cash-settled, USDT-margined.
 */
export const ZEC_PERP_SLUG = 'zec-usdt-perp'

export const ZEC_PERP_MARKET_ID =
  '0xef0dd633da52cfc21db866b05463c8b43c02265b86bf9257a5d39848cd2eea11'

/** The only verified derivative market surfaced by this venue: slug -> marketId. */
export const ZEC_ONLY_DERIVATIVE_MARKET_MAP: Record<string, string> = {
  [ZEC_PERP_SLUG]: ZEC_PERP_MARKET_ID
}

/** No spot markets in the ZEC-only venue. */
export const ZEC_ONLY_SPOT_MARKET_MAP: Record<string, string> = {}
