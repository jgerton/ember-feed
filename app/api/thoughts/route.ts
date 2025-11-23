import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/thoughts - List all thoughts with optional category filter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where = category ? { category } : {}

    const thoughts = await prisma.thought.findMany({
      where,
      orderBy: {
        createdAt: 'desc' // Newest first
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            url: true,
            source: true
          }
        }
      }
    })

    return NextResponse.json(thoughts)
  } catch (error) {
    console.error('Error fetching thoughts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch thoughts' },
      { status: 500 }
    )
  }
}

// POST /api/thoughts - Create a new thought
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { text, category, categoryFields, articleId } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Thought text is required' },
        { status: 400 }
      )
    }

    // Validate article exists if articleId is provided
    if (articleId) {
      const article = await prisma.article.findUnique({
        where: { id: articleId }
      })

      if (!article) {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 }
        )
      }
    }

    // Create thought
    const thought = await prisma.thought.create({
      data: {
        text: text.trim(),
        category: category?.trim() || null,
        categoryFields: categoryFields || null,
        articleId: articleId || null
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            url: true,
            source: true
          }
        }
      }
    })

    return NextResponse.json(thought, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error creating thought:', error)
    return NextResponse.json(
      { error: 'Failed to create thought', details: message },
      { status: 500 }
    )
  }
}
