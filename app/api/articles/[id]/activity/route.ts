import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/articles/[id]/activity - Track user activity for AI-tailored feed
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { action } = body

    if (!['read', 'upvote', 'downvote', 'save'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: read, upvote, downvote, or save' },
        { status: 400 }
      )
    }

    // Record user activity
    await prisma.userActivity.create({
      data: {
        articleId: params.id,
        action
      }
    })

    // Update article score based on action
    const article = await prisma.article.findUnique({
      where: { id: params.id }
    })

    if (article) {
      let scoreAdjustment = 0
      if (action === 'upvote') scoreAdjustment = 5
      if (action === 'downvote') scoreAdjustment = -5
      if (action === 'save') scoreAdjustment = 3
      if (action === 'read') scoreAdjustment = 1

      await prisma.article.update({
        where: { id: params.id },
        data: { score: Math.max(0, Math.min(100, article.score + scoreAdjustment)) }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking activity:', error)
    return NextResponse.json(
      { error: 'Failed to track activity' },
      { status: 500 }
    )
  }
}
