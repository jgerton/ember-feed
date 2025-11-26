import { NextResponse } from 'next/server'
import {
  queueRecommendationComputation,
  queueCacheWarming,
  queueTopicExtraction,
  recommendationsQueue,
  topicExtractionQueue,
  cacheWarmingQueue,
} from '@/lib/queue'
import { handleApiError, ValidationError, validateRequired } from '@/lib/errorHandler'

// Force Node.js runtime
export const runtime = 'nodejs'

// Sanitize log output to prevent log injection attacks
function sanitizeLogInput(input: string): string {
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

// POST /api/jobs - Trigger a background job
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data } = body

    // Validate required field
    validateRequired({ type }, ['type'])

    let job

    switch (type) {
      case 'recommendations':
        job = await queueRecommendationComputation()
        console.log('Queued recommendation computation job:', job.id)
        break

      case 'cache-warming':
        job = await queueCacheWarming()
        console.log('Queued cache warming job:', job.id)
        break

      case 'topic-extraction':
        if (!data?.articleId) {
          throw new ValidationError('articleId is required for topic extraction', 'articleId')
        }
        job = await queueTopicExtraction(data.articleId)
        console.log('Queued topic extraction job:', job.id, 'for article:', sanitizeLogInput(String(data.articleId)))
        break

      default:
        throw new ValidationError(`Unknown job type: ${type}`, 'type')
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        type,
        queuedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error, { endpoint: '/api/jobs', method: 'POST' })
  }
}

// GET /api/jobs - Get job queue status
export async function GET() {
  try {
    const [
      recommendationsWaiting,
      recommendationsActive,
      recommendationsCompleted,
      recommendationsFailed,
      topicExtractionWaiting,
      topicExtractionActive,
      topicExtractionCompleted,
      topicExtractionFailed,
      cacheWarmingWaiting,
      cacheWarmingActive,
      cacheWarmingCompleted,
      cacheWarmingFailed,
    ] = await Promise.all([
      recommendationsQueue.getWaitingCount(),
      recommendationsQueue.getActiveCount(),
      recommendationsQueue.getCompletedCount(),
      recommendationsQueue.getFailedCount(),
      topicExtractionQueue.getWaitingCount(),
      topicExtractionQueue.getActiveCount(),
      topicExtractionQueue.getCompletedCount(),
      topicExtractionQueue.getFailedCount(),
      cacheWarmingQueue.getWaitingCount(),
      cacheWarmingQueue.getActiveCount(),
      cacheWarmingQueue.getCompletedCount(),
      cacheWarmingQueue.getFailedCount(),
    ])

    return NextResponse.json({
      queues: {
        recommendations: {
          waiting: recommendationsWaiting,
          active: recommendationsActive,
          completed: recommendationsCompleted,
          failed: recommendationsFailed,
        },
        topicExtraction: {
          waiting: topicExtractionWaiting,
          active: topicExtractionActive,
          completed: topicExtractionCompleted,
          failed: topicExtractionFailed,
        },
        cacheWarming: {
          waiting: cacheWarmingWaiting,
          active: cacheWarmingActive,
          completed: cacheWarmingCompleted,
          failed: cacheWarmingFailed,
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return handleApiError(error, { endpoint: '/api/jobs', method: 'GET' })
  }
}
