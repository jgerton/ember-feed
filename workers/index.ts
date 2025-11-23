/**
 * Main worker process - starts all background job workers
 *
 * Run this file to start processing background jobs:
 * ```
 * npm run workers
 * ```
 */

import recommendationsWorker from './recommendationsWorker'
import topicExtractionWorker from './topicExtractionWorker'
import cacheWarmingWorker from './cacheWarmingWorker'
import {
  scheduleRecommendationJobs,
  scheduleCacheWarmingJobs,
  closeQueues,
} from '../lib/queue'

async function startWorkers() {
  console.log('🚀 Starting all background workers...')

  // Schedule recurring jobs
  await scheduleRecommendationJobs()
  await scheduleCacheWarmingJobs()

  console.log('✅ All workers started and jobs scheduled')
}

// Start workers
startWorkers().catch((error) => {
  console.error('❌ Failed to start workers:', error)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down workers...')
  await Promise.all([
    recommendationsWorker.close(),
    topicExtractionWorker.close(),
    cacheWarmingWorker.close(),
    closeQueues(),
  ])
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down workers...')
  await Promise.all([
    recommendationsWorker.close(),
    topicExtractionWorker.close(),
    cacheWarmingWorker.close(),
    closeQueues(),
  ])
  process.exit(0)
})
