import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { invalidateUserCaches } from '@/lib/cache'

// POST /api/analytics - Track user analytics event
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { articleId, action, durationSeconds, scrollPercentage } = body

    if (!articleId || !action) {
      return NextResponse.json(
        { error: 'articleId and action are required' },
        { status: 400 }
      )
    }

    // Validate action types
    const validActions = ['view', 'read', 'upvote', 'downvote', 'save']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate scrollPercentage if provided
    if (scrollPercentage !== undefined && (scrollPercentage < 0 || scrollPercentage > 100)) {
      return NextResponse.json(
        { error: 'scrollPercentage must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Verify article exists
    const article = await prisma.article.findUnique({
      where: { id: articleId }
    })

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Create analytics record
    const activity = await prisma.userActivity.create({
      data: {
        articleId,
        action,
        durationSeconds: durationSeconds !== undefined ? Math.max(0, Math.floor(durationSeconds)) : null,
        scrollPercentage: scrollPercentage !== undefined ? Math.max(0, Math.min(100, Math.floor(scrollPercentage))) : null,
        timestamp: new Date()
      }
    })

    // Invalidate user-related caches when activity changes
    // This ensures recommendations and digest reflect latest user behavior
    await invalidateUserCaches()

    return NextResponse.json({
      success: true,
      activity
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error tracking analytics:', error)
    return NextResponse.json(
      { error: 'Failed to track analytics', details: message },
      { status: 500 }
    )
  }
}
