import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPersonalizedFeed } from '@/lib/rankingService'

// GET /api/articles - List articles sorted by score (optionally personalized)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const personalized = searchParams.get('personalized') === 'true'

    // If personalized ranking requested, use ML-based feed
    if (personalized) {
      const articles = await getPersonalizedFeed(limit)
      return NextResponse.json(articles)
    }

    // Otherwise, return basic score-based ranking
    const articles = await prisma.article.findMany({
      orderBy: [
        { score: 'desc' },
        { publishedAt: 'desc' }
      ],
      take: limit
    })

    return NextResponse.json(articles)
  } catch (error) {
    console.error('Error fetching articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}
