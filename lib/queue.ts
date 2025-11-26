/**
 * Background job queue infrastructure using BullMQ and Redis
 *
 * Provides async job processing for expensive operations:
 * - Pre-computing recommendations
 * - Topic extraction for articles
 * - Cache warming
 * - Analytics aggregation
 */

import { Queue, QueueEvents } from 'bullmq'

// Redis connection configuration (shared with cache)
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, // Required for BullMQ
}

/**
 * Job Queues
 */

// Recommendations queue - pre-compute personalized recommendations
export const recommendationsQueue = new Queue('recommendations', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2s, then 4s, 8s
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 3600, // Or 1 hour, whichever comes first
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging
    },
  },
})

// Topic extraction queue - extract topics from new articles
export const topicExtractionQueue = new Queue('topic-extraction', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 50,
      age: 1800,
    },
    removeOnFail: {
      count: 200,
    },
  },
})

// Cache warming queue - pre-populate cache during off-peak
export const cacheWarmingQueue = new Queue('cache-warming', {
  connection,
  defaultJobOptions: {
    attempts: 1, // Cache warming is best-effort
    removeOnComplete: {
      count: 10,
      age: 600,
    },
  },
})

/**
 * Queue Events for monitoring
 */

export const recommendationsEvents = new QueueEvents('recommendations', { connection })
export const topicExtractionEvents = new QueueEvents('topic-extraction', { connection })
export const cacheWarmingEvents = new QueueEvents('cache-warming', { connection })

// Log queue events
recommendationsEvents.on('completed', ({ jobId }) => {
  console.log(`✅ Recommendation job ${jobId} completed`)
})

recommendationsEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`❌ Recommendation job ${jobId} failed:`, failedReason)
})

topicExtractionEvents.on('completed', ({ jobId }) => {
  console.log(`✅ Topic extraction job ${jobId} completed`)
})

topicExtractionEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`❌ Topic extraction job ${jobId} failed:`, failedReason)
})

cacheWarmingEvents.on('completed', ({ jobId }) => {
  console.log(`✅ Cache warming job ${jobId} completed`)
})

/**
 * Helper functions to add jobs to queues
 */

export async function queueRecommendationComputation() {
  const job = await recommendationsQueue.add(
    'compute-recommendations',
    {},
    {
      priority: 2, // Medium priority
    }
  )
  console.log(`📋 Queued recommendation computation: ${job.id}`)
  return job
}

// Sanitize log output to prevent log injection attacks
function sanitizeLogInput(input: string): string {
  // Remove newlines, carriage returns, and control characters
  // Using character codes to avoid ESLint no-control-regex warning
  let result = ''
  for (const char of input) {
    const code = char.charCodeAt(0)
    // Skip control characters (0-31) and DEL (127)
    if (code >= 32 && code !== 127) {
      result += char
    }
  }
  return result
}

export async function queueTopicExtraction(articleId: string) {
  const job = await topicExtractionQueue.add(
    'extract-topics',
    { articleId },
    {
      priority: 1, // High priority (process new articles quickly)
    }
  )
  console.log(`📋 Queued topic extraction for article: ${sanitizeLogInput(articleId)}`)
  return job
}

export async function queueCacheWarming() {
  const job = await cacheWarmingQueue.add(
    'warm-cache',
    {},
    {
      priority: 3, // Low priority (background task)
    }
  )
  console.log(`📋 Queued cache warming: ${job.id}`)
  return job
}

/**
 * Schedule recurring jobs
 */

// Pre-compute recommendations every 10 minutes
export async function scheduleRecommendationJobs() {
  await recommendationsQueue.add(
    'compute-recommendations',
    {},
    {
      repeat: {
        pattern: '*/10 * * * *', // Every 10 minutes
      },
    }
  )
  console.log('⏰ Scheduled recurring recommendation computation (every 10 min)')
}

// Warm cache every 5 minutes
export async function scheduleCacheWarmingJobs() {
  await cacheWarmingQueue.add(
    'warm-cache',
    {},
    {
      repeat: {
        pattern: '*/5 * * * *', // Every 5 minutes
      },
    }
  )
  console.log('⏰ Scheduled recurring cache warming (every 5 min)')
}

/**
 * Graceful shutdown
 */
export async function closeQueues() {
  await Promise.all([
    recommendationsQueue.close(),
    topicExtractionQueue.close(),
    cacheWarmingQueue.close(),
    recommendationsEvents.close(),
    topicExtractionEvents.close(),
    cacheWarmingEvents.close(),
  ])
  console.log('🛑 All queues closed')
}
