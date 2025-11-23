import { NextResponse } from 'next/server'
import { getRecommendations } from '@/lib/rankingService'
import { prisma } from '@/lib/db'
import { createCachedResponse } from '@/lib/cacheHeaders'

// Force Node.js runtime (required for crypto module in cacheHeaders)
export const runtime = 'nodejs'

// GET /api/recommendations - Get personalized article recommendations
// Supports pagination for browsing through recommendations
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50) // Max 50 per page
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0) // Offset for pagination

    // Get more recommendations to support pagination
    const totalToFetch = offset + limit + 10 // Fetch extra to check if there are more
    const recommendations = await getRecommendations(totalToFetch)

    if (recommendations.length === 0) {
      // No recommendations available (likely new user with no activity)
      const emptyResponse = {
        recommendations: [],
        message: 'Start reading articles to get personalized recommendations'
      }
      return createCachedResponse(request, emptyResponse, 'dynamic')
    }

    // Fetch full article details for recommended articles
    const articleIds = recommendations.map(r => r.articleId)
    const articles = await prisma.article.findMany({
      where: {
        id: { in: articleIds }
      },
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

    // Create article map for quick lookup
    const articleMap = new Map(articles.map(a => [a.id, a]))

    // Combine articles with their recommendation metadata
    const allResults = recommendations.map(rec => {
      const article = articleMap.get(rec.articleId)
      if (!article) return null

      return {
        ...article,
        recommendation: {
          score: rec.score,
          reason: rec.reason,
          breakdown: rec.breakdown
        }
      }
    }).filter(Boolean)

    // Apply pagination
    const paginatedResults = allResults.slice(offset, offset + limit)
    const hasMore = allResults.length > offset + limit

    const responseData = {
      recommendations: paginatedResults,
      pagination: {
        offset,
        limit,
        count: paginatedResults.length,
        total: allResults.length,
        hasMore
      }
    }

    // Recommendations are personalized, use dynamic caching (1 min)
    return createCachedResponse(request, responseData, 'dynamic')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error fetching recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations', details: message },
      { status: 500 }
    )
  }
}
