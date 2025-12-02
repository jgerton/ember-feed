import { NextResponse } from 'next/server'
import { getRecommendations } from '@/lib/rankingService'
import { prisma } from '@/lib/db'
import { createCachedResponse } from '@/lib/cacheHeaders'

// Force Node.js runtime (required for crypto module in cacheHeaders)
export const runtime = 'nodejs'

// GET /api/recommendations - Get personalized article recommendations
// Supports both page-based and offset-based pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50) // Max 50 per page
    const page = parseInt(searchParams.get('page') || '1') // Page number for page-based pagination
    const offset = searchParams.get('offset') !== null
      ? Math.max(parseInt(searchParams.get('offset') || '0'), 0)
      : (page - 1) * limit // Calculate offset from page

    // Get more recommendations to support pagination
    const totalToFetch = offset + limit + 50 // Fetch extra to check if there are more
    const recommendations = await getRecommendations(totalToFetch)

    if (recommendations.length === 0) {
      // No recommendations available (likely new user with no activity)
      const emptyResponse = {
        recommendations: [],
        message: 'Start reading articles to get personalized recommendations',
        pagination: {
          page: 1,
          offset: 0,
          limit,
          count: 0,
          total: 0,
          totalPages: 0,
          hasMore: false
        }
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

    // Create article map for quick lookup - use explicit type for proper inference
    type ArticleWithTopics = typeof articles[number]
    const articleMap = new Map<string, ArticleWithTopics>()
    for (const article of articles) {
      articleMap.set(article.id, article)
    }

    // Combine articles with their recommendation metadata
    const allResults = recommendations
      .flatMap(rec => {
        const article = articleMap.get(rec.articleId)
        if (!article) return []

        return [{
          id: article.id,
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source,
          score: article.score,
          publishedAt: article.publishedAt,
          createdAt: article.createdAt,
          topics: article.topics,
          recommendation: {
            score: rec.score,
            reason: rec.reason,
            breakdown: rec.breakdown
          }
        }]
      })

    // Apply pagination
    const paginatedResults = allResults.slice(offset, offset + limit)
    const hasMore = allResults.length > offset + limit
    const totalPages = Math.ceil(allResults.length / limit)

    const responseData = {
      recommendations: paginatedResults,
      pagination: {
        page,
        offset,
        limit,
        count: paginatedResults.length,
        total: allResults.length,
        totalPages,
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
