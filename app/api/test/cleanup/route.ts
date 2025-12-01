/**
 * Test Cleanup API Endpoint
 *
 * Provides database cleanup for E2E/Playwright tests.
 * Only available when TEST_MODE=true for security.
 *
 * POST /api/test/cleanup
 * Body: {
 *   includeRedis?: boolean,
 *   since?: string (ISO timestamp) - Only delete records created after this time
 *   mode?: 'all' | 'since' - 'all' wipes everything, 'since' preserves older data
 * }
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Redis from 'ioredis'

export async function POST(request: Request) {
  // Security: Only allow in test mode
  if (process.env.TEST_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Test endpoints are not available. Set TEST_MODE=true to enable.' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { includeRedis = false, since, mode = since ? 'since' : 'all' } = body

    let cleanupMode = mode
    let sinceDate: Date | undefined

    // If 'since' timestamp provided, only delete records created after that time
    if (since) {
      sinceDate = new Date(since)
      if (isNaN(sinceDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid "since" timestamp. Use ISO format (e.g., 2024-01-01T00:00:00Z)' },
          { status: 400 }
        )
      }
      cleanupMode = 'since'
    }

    if (cleanupMode === 'since' && sinceDate) {
      // Delete only records created after the specified timestamp
      // This preserves existing data while cleaning up test-created records
      const whereCreatedAfter = { createdAt: { gte: sinceDate } }

      await prisma.$transaction([
        // Leaf tables that depend on Article
        prisma.userActivity.deleteMany({ where: { timestamp: { gte: sinceDate } } }),
        prisma.articleTopic.deleteMany({ where: whereCreatedAfter }),
        prisma.savedArticle.deleteMany({ where: { savedAt: { gte: sinceDate } } }),
        prisma.thought.deleteMany({ where: whereCreatedAfter }),

        // Leaf tables that depend on Feed
        prisma.n8nError.deleteMany({ where: whereCreatedAfter }),
        prisma.userFeedSubscription.deleteMany({ where: whereCreatedAfter }),

        // Parent tables (now safe to delete)
        prisma.article.deleteMany({ where: whereCreatedAfter }),
        prisma.topic.deleteMany({ where: whereCreatedAfter }),
        prisma.feed.deleteMany({ where: whereCreatedAfter }),

        // Independent tables
        prisma.logEntry.deleteMany({ where: whereCreatedAfter }),
        prisma.todo.deleteMany({ where: whereCreatedAfter }),
        prisma.userSettings.deleteMany({ where: whereCreatedAfter }),
        prisma.hotTopic.deleteMany({ where: whereCreatedAfter }),
        prisma.trendingUpTopic.deleteMany({ where: whereCreatedAfter }),
        prisma.keywordHistory.deleteMany({ where: whereCreatedAfter }),
      ])
    } else {
      // Delete ALL records (original behavior)
      await prisma.$transaction([
        // Leaf tables that depend on Article
        prisma.userActivity.deleteMany(),
        prisma.articleTopic.deleteMany(),
        prisma.savedArticle.deleteMany(),
        prisma.thought.deleteMany(),

        // Leaf tables that depend on Feed
        prisma.n8nError.deleteMany(),
        prisma.userFeedSubscription.deleteMany(),

        // Parent tables (now safe to delete)
        prisma.article.deleteMany(),
        prisma.topic.deleteMany(),
        prisma.feed.deleteMany(),

        // Independent tables
        prisma.logEntry.deleteMany(),
        prisma.todo.deleteMany(),
        prisma.userSettings.deleteMany(),
        prisma.hotTopic.deleteMany(),
        prisma.trendingUpTopic.deleteMany(),
        prisma.keywordHistory.deleteMany(),
      ])
    }

    let redisCleared = false

    // Optionally clear Redis test database
    if (includeRedis) {
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: 1, // Test database (separate from production DB 0)
      })

      await redis.flushdb()
      await redis.quit()
      redisCleared = true
    }

    return NextResponse.json({
      success: true,
      message: 'Test data cleaned',
      details: {
        postgresql: cleanupMode === 'since'
          ? `Records created after ${sinceDate?.toISOString()} deleted`
          : 'All tables cleared',
        redis: redisCleared ? 'Test database flushed (DB 1)' : 'Not cleared (includeRedis=false)',
        mode: cleanupMode,
      },
    })
  } catch (error) {
    console.error('Test cleanup failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also support GET for easy browser testing
export async function GET() {
  if (process.env.TEST_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Test endpoints are not available. Set TEST_MODE=true to enable.' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    endpoint: '/api/test/cleanup',
    method: 'POST',
    description: 'Cleans test data from PostgreSQL and optionally Redis',
    body: {
      mode: "'all' | 'since' - 'all' wipes everything, 'since' preserves older data (default: 'all', or 'since' if timestamp provided)",
      since: 'ISO timestamp (optional) - Only delete records created after this time. Preserves existing data.',
      includeRedis: 'boolean (optional, default: false) - Also flush Redis test DB',
    },
    examples: {
      wipeAll: { mode: 'all' },
      preserveExisting: { since: '2024-01-01T00:00:00Z' },
      withRedis: { mode: 'all', includeRedis: true },
    },
    security: 'Requires TEST_MODE=true environment variable',
  })
}
