import { config } from './config'
import { createServer } from './server'
import { startBatchScheduler } from './batch'

const app = createServer()

startBatchScheduler()

app.listen(config.port, () => {
  console.log(`zec-perps relayer listening on :${config.port}`)
  console.log(`  network=${config.network} market=${config.marketId}`)
  console.log(
    `  dryRun=${config.dryRun} anchor=${config.anchorMode} revealWindowMs=${config.revealWindowMs}`
  )

  if (config.dryRun) {
    console.log(
      '  DRY_RUN: sealed orders are verified + batched but NOT broadcast to Injective.'
    )
  }
})
