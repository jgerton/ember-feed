import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPersonalizedFeed } from '@/lib/rankingService'
import { cache } from '@/lib/cache'
import { createCachedResponse } from '@/lib/cacheHeaders'

// Force Node.js runtime (required for crypto module in cacheHeaders)
export const runtime = 'nodejs'

// GET /api/digest - Get daily digest data
// Optimized with parallel queries and caching
export async function GET(request: Request) {
  try {
    // Check server-side cache first (2 minute TTL for digest)
    const cached = await cache.get<any>('digest-data')
    if (cached) {
      // Return from cache with HTTP cache headers
      return createCachedResponse(request, cached, 'dynamic')
    }

    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Run independent queries in parallel for better performance
    const [allArticles, unreadTodos, recentLogs, newArticleCount] = await Promise.all([
      getPersonalizedFeed(20), // Get 20 to filter by time
      prisma.todo.findMany({
        where: { completed: false },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.logEntry.findMany({
        where: {
          createdAt: {
            gte: yesterday
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.article.count({
        where: {
          publishedAt: {
            gte: yesterday
          }
        }
      })
    ])

    // Filter articles by time
    const recentArticles = allArticles
      .filter(article => new Date(article.publishedAt) >= yesterday)
      .slice(0, 5)

    // Group log entries by type
    const logsByType = {
      discoveries: recentLogs.filter(log => log.type === 'discovery'),
      accomplishments: recentLogs.filter(log => log.type === 'accomplishment'),
      blockers: recentLogs.filter(log => log.type === 'blocker'),
      thoughts: recentLogs.filter(log => log.type === 'thought')
    }

    // Calculate trending topics from recent articles
    const topicCounts: Record<string, { name: string; count: number }> = {}
    recentArticles.forEach(article => {
      article.topics?.forEach(topicRelation => {
        const topic = topicRelation.topic
        if (topic?.slug) {
          if (!topicCounts[topic.slug]) {
            topicCounts[topic.slug] = { name: topic.name, count: 0 }
          }
          topicCounts[topic.slug].count++
        }
      })
    })

    const trendingTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([slug, data]) => ({ slug, name: data.name, count: data.count }))

    // Build response object
    const digestData = {
      date: now.toISOString(),
      topArticles: recentArticles,
      unreadTodos,
      logs: logsByType,
      trendingTopics,
      stats: {
        newArticles: newArticleCount,
        unreadTodoCount: unreadTodos.length,
        logEntryCount: recentLogs.length
      }
    }

    // Cache for 2 minutes (server-side)
    await cache.set('digest-data', digestData, 120)

    // Return with HTTP cache headers (browser-side)
    return createCachedResponse(request, digestData, 'dynamic')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error fetching digest:', error)
    return NextResponse.json(
      { error: 'Failed to fetch digest', details: message },
      { status: 500 }
    )
  }
}
