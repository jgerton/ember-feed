import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/n8n/feeds
 * Returns active feeds for n8n to process
 *
 * Query params:
 * - type: filter by type (rss, substack, medium, etc.)
 * - status: filter by status (active, failing, quarantined)
 * - ids: comma-separated list of specific feed IDs
 * - priority_min: minimum priority (0-100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const ids = searchParams.get('ids')
    const priorityMin = searchParams.get('priority_min')

    // Build filter conditions
    const where: Record<string, unknown> = {
      enabled: true,
    }

    // Filter by type(s)
    if (type) {
      const types = type.split(',').map((t) => t.trim())
      where.type = { in: types }
    }

    // Filter by status
    if (status) {
      const statuses = status.split(',').map((s) => s.trim())
      where.status = { in: statuses }
    }

    // Filter by specific IDs
    if (ids) {
      const idList = ids.split(',').map((id) => id.trim())
      where.id = { in: idList }
    }

    // Filter by minimum priority
    if (priorityMin) {
      const minPriority = parseInt(priorityMin, 10)
      if (!isNaN(minPriority)) {
        where.priority = { gte: minPriority }
      }
    }

    const feeds = await prisma.feed.findMany({
      where,
      select: {
        id: true,
        name: true,
        url: true,
        type: true,
        category: true,
        status: true,
        priority: true,
        lastFetched: true,
        lastSuccessAt: true,
        consecutiveFailures: true,
      },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      count: feeds.length,
      feeds,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error fetching feeds for n8n:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feeds', details: message },
      { status: 500 }
    )
  }
}
