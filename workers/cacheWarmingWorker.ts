/**
 * Background worker for warming cache
 *
 * Pre-populates Redis cache with frequently accessed data:
 * - User profile
 * - Digest data
 * - Top articles
 *
 * Runs periodically during off-peak to ensure cache is always warm
 */

import { Worker } from 'bullmq'
import { buildUserProfile } from '../lib/rankingService'
import { prisma } from '../lib/db'
import { cache } from '../lib/cache'
import { logJob, logError, logger } from '../lib/logger'

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
}

const cacheWarmingWorker = new Worker(
  'cache-warming',
  async (job) => {
    logJob('cache-warming', job.id || '', 'started')

    try {
      const startTime = Date.now()
      const warmed = []

      // 1. Warm user profile cache
      const profile = await buildUserProfile()
      await cache.set('user-profile', profile, 300)
      warmed.push('user-profile')

      // 2. Warm top articles cache
      const topArticles = await prisma.article.findMany({
        where: {},
        orderBy: [{ score: 'desc' }, { publishedAt: 'desc' }],
        take: 50,
        include: {
          topics: {
            include: {
              topic: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
            orderBy: { relevance: 'desc' },
          },
        },
      })
      await cache.set('top-articles-50', topArticles, 600) // 10 min TTL
      warmed.push('top-articles-50')

      // 3. Warm digest data preview
      const unreadTodos = await prisma.todo.findMany({
        where: { completed: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
      await cache.set('unread-todos', unreadTodos, 300)
      warmed.push('unread-todos')

      const duration = Date.now() - startTime

      logJob('cache-warming', job.id || '', 'completed', {
        count: warmed.length,
        warmed,
        duration,
      })

      return {
        warmed,
        count: warmed.length,
        duration,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      logJob('cache-warming', job.id || '', 'failed')
      logError(error, { jobType: 'cache-warming', jobId: job.id })
      // Don't throw - cache warming is best-effort
      return {
        warmed: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
  {
    connection,
    concurrency: 1, // One at a time (database intensive)
  }
)

// Worker event listeners
cacheWarmingWorker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, 'Cache warming job completed')
})

cacheWarmingWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error: error.message }, 'Cache warming job failed')
})

cacheWarmingWorker.on('error', (error) => {
  logger.error({ error: error.message }, 'Cache warming worker error')
})

logger.info('Cache warming worker started')

export default cacheWarmingWorker
