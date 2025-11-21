import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/articles - List articles sorted by score
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

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
