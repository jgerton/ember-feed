import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPersonalizedFeed } from '@/lib/rankingService'
import { createCachedResponse } from '@/lib/cacheHeaders'

// Force Node.js runtime (required for crypto module in cacheHeaders)
export const runtime = 'nodejs'

// GET /api/articles - List articles sorted by score (optionally personalized, filterable by topic)
// Supports cursor-based pagination for efficient handling of large datasets
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 per page
    const personalized = searchParams.get('personalized') === 'true'
    const topicSlug = searchParams.get('topic') // Filter by topic slug
    const cursor = searchParams.get('cursor') // Cursor for pagination

    // If personalized ranking requested, use ML-based feed
    if (personalized) {
      const articles = await getPersonalizedFeed(limit, topicSlug)
      // Personalized feeds change frequently, use dynamic caching (1 min)
      return createCachedResponse(request, articles, 'dynamic')
    }

    // Build where clause for topic filtering
    const whereClause = topicSlug ? {
      topics: {
        some: {
          topic: {
            slug: topicSlug
          }
        }
      }
    } : {}

    // Cursor-based pagination for non-personalized feeds
    const articles = await prisma.article.findMany({
      where: whereClause,
      orderBy: [
        { score: 'desc' },
        { publishedAt: 'desc' },
        { id: 'asc' } // Stable sort with ID as tiebreaker
      ],
      take: limit + 1, // Fetch one extra to check if there are more results
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1 // Skip the cursor itself
      }),
      include: {
        topics: {
          include: {
            topic: {
              select: {
                name: true,
                slug: true
              }
            }
          },
          orderBy: {
            relevance: 'desc'
          }
        }
      }
    })

    // Check if there are more results
    const hasMore = articles.length > limit
    const results = hasMore ? articles.slice(0, limit) : articles
    const nextCursor = hasMore ? results[results.length - 1].id : null

    const response = {
      articles: results,
      pagination: {
        hasMore,
        nextCursor,
        count: results.length
      }
    }

    // Non-personalized feeds change less frequently, use semi-static caching (5 min)
    return createCachedResponse(request, response, 'semiStatic')
  } catch (error) {
    console.error('Error fetching articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}
