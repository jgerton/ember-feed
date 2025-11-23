import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/topics - List all topics with article counts
export async function GET() {
  try {
    const topics = await prisma.topic.findMany({
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            articles: true
          }
        }
      }
    })

    return NextResponse.json({
      total: topics.length,
      topics: topics.map(topic => ({
        id: topic.id,
        name: topic.name,
        slug: topic.slug,
        articleCount: topic._count.articles
      }))
    })
  } catch (error) {
    console.error('Error fetching topics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    )
  }
}
