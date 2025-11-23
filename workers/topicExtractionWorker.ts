/**
 * Background worker for extracting topics from articles
 *
 * Processes new articles to:
 * - Extract relevant topics using keyword matching
 * - Associate articles with topics in the database
 * - Runs asynchronously to avoid blocking article ingestion
 */

import { Worker } from 'bullmq'
import { extractAndAssignTopics } from '../lib/topicExtraction'
import { logJob, logError, logger } from '../lib/logger'

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
}

const topicExtractionWorker = new Worker(
  'topic-extraction',
  async (job) => {
    const { articleId } = job.data
    logJob('topic-extraction', job.id || '', 'started', { articleId })

    try {
      const startTime = Date.now()

      // Extract and assign topics to the article
      const topics = await extractAndAssignTopics(articleId)

      const duration = Date.now() - startTime

      logJob('topic-extraction', job.id || '', 'completed', {
        articleId,
        topicCount: topics.length,
        topics: topics.map((t) => t.topic.name),
        duration,
      })

      return {
        articleId,
        topicCount: topics.length,
        topics: topics.map((t) => t.topic.name),
        duration,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      logJob('topic-extraction', job.id || '', 'failed', { articleId })
      logError(error, { jobType: 'topic-extraction', jobId: job.id, articleId })
      throw error // Trigger retry
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 articles concurrently (I/O bound)
  }
)

// Worker event listeners
topicExtractionWorker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, 'Topic extraction job completed')
})

topicExtractionWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error: error.message }, 'Topic extraction job failed')
})

topicExtractionWorker.on('error', (error) => {
  logger.error({ error: error.message }, 'Topic extraction worker error')
})

logger.info('Topic extraction worker started')

export default topicExtractionWorker
