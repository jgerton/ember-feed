import { NextResponse } from 'next/server'
import { testFeed, restoreFeed } from '@/lib/feedHealthService'
import { prisma } from '@/lib/db'

// GET /api/feeds/[id] - Test a feed
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const result = await testFeed(params.id)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error testing feed:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

// POST /api/feeds/[id] - Restore a quarantined feed
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const result = await restoreFeed(params.id)

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error restoring feed:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

// Valid feed types and categories
const VALID_FEED_TYPES = ['rss', 'reddit', 'hackernews', 'substack', 'medium', 'api'] as const
const VALID_FEED_CATEGORIES = ['tech', 'business', 'science', 'developer', 'startup'] as const

// PATCH /api/feeds/[id] - Update a feed
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { name, priority, status, category, type, enabled, updateFrequency } = body

    const updateData: {
      name?: string
      priority?: number
      status?: string
      category?: string
      type?: string
      enabled?: boolean
      updateFrequency?: number
    } = {}

    if (name !== undefined) updateData.name = name
    if (priority !== undefined) {
      updateData.priority = Math.max(0, Math.min(100, priority)) // Clamp between 0-100
    }
    if (status !== undefined) {
      const validStatuses = ['active', 'failing', 'quarantined']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.status = status
    }
    if (category !== undefined) {
      if (!VALID_FEED_CATEGORIES.includes(category)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${VALID_FEED_CATEGORIES.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.category = category
    }
    if (type !== undefined) {
      if (!VALID_FEED_TYPES.includes(type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${VALID_FEED_TYPES.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.type = type
    }
    if (enabled !== undefined) {
      updateData.enabled = Boolean(enabled)
    }
    if (updateFrequency !== undefined) {
      // Clamp between 15 minutes and 24 hours (1440 minutes)
      updateData.updateFrequency = Math.max(15, Math.min(1440, updateFrequency))
    }

    const feed = await prisma.feed.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Feed updated successfully',
      feed
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error updating feed:', error)
    return NextResponse.json(
      { error: 'Failed to update feed', details: message },
      { status: 500 }
    )
  }
}

// DELETE /api/feeds/[id] - Delete a feed
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    await prisma.feed.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Feed deleted successfully'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error deleting feed:', error)
    return NextResponse.json(
      { error: 'Failed to delete feed', details: message },
      { status: 500 }
    )
  }
}
