import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Calculate relevance score for search results
function calculateRelevance(article: any, query: string): number {
  if (!query) return 0

  const lowerQuery = query.toLowerCase()
  const title = article.title.toLowerCase()
  const description = article.description.toLowerCase()
  const source = article.source.toLowerCase()

  let score = 0

  // Title matches (weight: 3x)
  const titleMatches = (title.match(new RegExp(lowerQuery, 'gi')) || []).length
  score += titleMatches * 3

  // Description matches (weight: 1x)
  const descriptionMatches = (description.match(new RegExp(lowerQuery, 'gi')) || []).length
  score += descriptionMatches * 1

  // Source matches (weight: 2x)
  if (source.includes(lowerQuery)) {
    score += 2
  }

  return score
}

// GET /api/search - Search articles with filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Search parameters
    const query = searchParams.get('q') || ''
    const topic = searchParams.get('topic') // Topic slug
    const source = searchParams.get('source') // Filter by source
    const minScore = parseInt(searchParams.get('minScore') || '0')
    const maxScore = parseInt(searchParams.get('maxScore') || '100')
    const startDate = searchParams.get('startDate') // ISO date string
    const endDate = searchParams.get('endDate') // ISO date string
    const sortBy = searchParams.get('sort') || 'relevance' // 'relevance' or 'date'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build where clause
    const whereClause: any = {
      AND: []
    }

    // Text search - match against title, description, or source
    // Note: SQLite is case-insensitive by default for LIKE queries
    if (query) {
      whereClause.AND.push({
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
          { source: { contains: query } }
        ]
      })
    }

    // Topic filter
    if (topic) {
      whereClause.AND.push({
        topics: {
          some: {
            topic: {
              slug: topic
            }
          }
        }
      })
    }

    // Source filter
    if (source) {
      whereClause.AND.push({
        source: { equals: source }
      })
    }

    // Score range filter
    if (minScore > 0 || maxScore < 100) {
      whereClause.AND.push({
        score: {
          gte: minScore,
          lte: maxScore
        }
      })
    }

    // Date range filter
    if (startDate || endDate) {
      const dateFilter: any = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) dateFilter.lte = new Date(endDate)
      whereClause.AND.push({
        publishedAt: dateFilter
      })
    }

    // Clean up empty AND array
    if (whereClause.AND.length === 0) {
      delete whereClause.AND
    }

    // Fetch articles
    const articles = await prisma.article.findMany({
      where: whereClause,
      take: limit,
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

    // Sort results
    let sortedArticles = articles

    if (sortBy === 'relevance' && query) {
      // Calculate relevance scores and sort
      const articlesWithRelevance = articles.map(article => ({
        ...article,
        relevanceScore: calculateRelevance(article, query)
      }))

      sortedArticles = articlesWithRelevance
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .map(({ relevanceScore, ...article }) => article)
    } else if (sortBy === 'date') {
      sortedArticles = articles.sort((a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
    } else if (sortBy === 'score') {
      sortedArticles = articles.sort((a, b) => b.score - a.score)
    }

    return NextResponse.json({
      query,
      filters: {
        topic,
        source,
        minScore,
        maxScore,
        startDate,
        endDate,
        sortBy
      },
      total: sortedArticles.length,
      results: sortedArticles
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error searching articles:', error)
    return NextResponse.json(
      { error: 'Failed to search articles', details: message },
      { status: 500 }
    )
  }
}
