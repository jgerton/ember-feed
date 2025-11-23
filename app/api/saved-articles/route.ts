import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/saved-articles - List all saved articles
export async function GET() {
  try {
    const savedArticles = await prisma.savedArticle.findMany({
      orderBy: [
        { priority: 'desc' },
        { savedAt: 'desc' }
      ],
      include: {
        article: {
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
        }
      }
    })

    return NextResponse.json(savedArticles)
  } catch (error) {
    console.error('Error fetching saved articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch saved articles' },
      { status: 500 }
    )
  }
}

// POST /api/saved-articles - Save an article to read later
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { articleId, priority = 3, notes } = body

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      )
    }

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id: articleId }
    })

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Check if already saved
    const existingSaved = await prisma.savedArticle.findUnique({
      where: { articleId }
    })

    if (existingSaved) {
      return NextResponse.json(
        { error: 'Article already saved', savedArticle: existingSaved },
        { status: 409 }
      )
    }

    // Create saved article
    const savedArticle = await prisma.savedArticle.create({
      data: {
        articleId,
        priority,
        notes
      },
      include: {
        article: {
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
        }
      }
    })

    // Track save activity
    await prisma.userActivity.create({
      data: {
        articleId,
        action: 'save'
      }
    })

    return NextResponse.json(savedArticle, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error saving article:', error)
    return NextResponse.json(
      { error: 'Failed to save article', details: message },
      { status: 500 }
    )
  }
}
