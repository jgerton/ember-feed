/**
 * Background worker for pre-computing article recommendations
 *
 * Runs asynchronously to:
 * - Pre-compute recommendation scores for all articles
 * - Cache results in Redis for fast retrieval
 * - Reduces latency on /api/recommendations endpoint
 */

import { Worker } from 'bullmq'
import { getRecommendations } from '../lib/rankingService'
import { cache } from '../lib/cache'
import { logJob, logError, logger } from '../lib/logger'

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
}

const recommendationsWorker = new Worker(
  'recommendations',
  async (job) => {
    logJob('recommendations', job.id || '', 'started')

    try {
      const startTime = Date.now()

      // Pre-compute top 100 recommendations
      const recommendations = await getRecommendations(100)

      // Cache the results for 5 minutes
      await cache.set('precomputed-recommendations', recommendations, 300)

      const duration = Date.now() - startTime

      logJob('recommendations', job.id || '', 'completed', {
        count: recommendations.length,
        duration,
      })

      return {
        count: recommendations.length,
        duration,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      logJob('recommendations', job.id || '', 'failed')
      logError(error, { jobType: 'recommendations', jobId: job.id })
      throw error // Trigger retry
    }
  },
  {
    connection,
    concurrency: 1, // Process one job at a time (CPU intensive)
  }
)

// Worker event listeners
recommendationsWorker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, 'Recommendation job completed')
})

recommendationsWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error: error.message }, 'Recommendation job failed')
})

recommendationsWorker.on('error', (error) => {
  logger.error({ error: error.message }, 'Recommendation worker error')
})

logger.info('Recommendations worker started')

export default recommendationsWorker
