import 'dotenv/config'

export interface RelayerConfig {
  port: number
  network: string
  dryRun: boolean
  marketId: string
  corsOrigin: string
  quoteDecimals: number
  revealWindowMs: number
  relayerPrivateKey: string
  anchorMode: 'none' | 'memo'
  relayerSubaccountIndex: number
}

const env = process.env

export const config: RelayerConfig = {
  network: env.NETWORK || 'mainnet',
  marketId:
    env.MARKET_ID ||
    '0xef0dd633da52cfc21db866b05463c8b43c02265b86bf9257a5d39848cd2eea11',
  quoteDecimals: Number(env.QUOTE_DECIMALS || 6),
  revealWindowMs: Number(env.REVEAL_WINDOW_MS || 15000),
  port: Number(env.PORT || 8888),
  corsOrigin: env.CORS_ORIGIN || '*',
  dryRun: env.DRY_RUN !== 'false',
  relayerPrivateKey: env.RELAYER_PRIVATE_KEY || '',
  relayerSubaccountIndex: Number(env.RELAYER_SUBACCOUNT_INDEX || 0),
  anchorMode: env.ANCHOR_MODE === 'memo' ? 'memo' : 'none'
}
