import cors from 'cors'
import express from 'express'
import { config } from './config'
import { ledger } from './ledger'
import { anchorCommitment } from './executor'
import { verifyCommitment } from './commitment'
import type { RevealPayload } from './types'

export function createServer() {
  const app = express()

  app.use(cors({ origin: config.corsOrigin }))
  app.use(express.json({ limit: '256kb' }))

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      dryRun: config.dryRun,
      network: config.network,
      marketId: config.marketId,
      anchorMode: config.anchorMode
    })
  })

  app.post('/seal', async (req, res) => {
    const { commitment, sealed } = req.body ?? {}

    if (typeof commitment !== 'string' || typeof sealed !== 'string') {
      res.status(400).json({ error: 'commitment and sealed are required' })
      return
    }

    let reveal: RevealPayload

    try {
      reveal = JSON.parse(Buffer.from(sealed, 'base64').toString('utf-8'))
    } catch {
      res.status(400).json({ error: 'sealed payload is not valid base64 JSON' })
      return
    }

    if (!verifyCommitment(reveal, commitment)) {
      res.status(400).json({ error: 'commitment does not match sealed order' })
      return
    }

    const order = ledger.addOrder(commitment, reveal)
    const anchorTxHash = await anchorCommitment(commitment).catch(() => undefined)

    if (anchorTxHash) {
      ledger.updateOrder(order.id, { anchorTxHash })
    }

    res.json({
      id: order.id,
      batchId: order.batchId,
      revealAt: order.revealAt,
      anchorTxHash
    })
  })

  app.get('/order/:id', (req, res) => {
    const order = ledger.getOrder(req.params.id)

    if (!order) {
      res.status(404).json({ error: 'not found' })
      return
    }

    res.json({
      id: order.id,
      status: order.status,
      batchId: order.batchId,
      txHash: order.txHash,
      error: order.error,
      anchorTxHash: order.anchorTxHash
    })
  })

  app.get('/batches', (_req, res) => {
    res.json(
      ledger.allBatches().map((batch) => ({
        id: batch.id,
        opensAt: batch.opensAt,
        closesAt: batch.closesAt,
        closed: batch.closed,
        orderCount: batch.orderIds.length
      }))
    )
  })

  return app
}
