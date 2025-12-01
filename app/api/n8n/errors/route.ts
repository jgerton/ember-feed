import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireN8nAuth } from '@/lib/n8n-auth'

/**
 * Error report from n8n workflow
 */
interface ErrorReport {
  workflowId: string
  workflowName: string
  executionId: string
  nodeId?: string
  nodeName?: string
  errorType: string
  errorMessage: string
  feedId?: string
  context?: Record<string, unknown>
}

/**
 * POST /api/n8n/errors
 * n8n reports workflow errors here for tracking
 */
export async function POST(request: Request) {
  // Validate API key
  const authError = requireN8nAuth(request)
  if (authError) return authError

  try {
    const body = (await request.json()) as ErrorReport

    // Validate required fields
    const required = ['workflowId', 'workflowName', 'executionId', 'errorType', 'errorMessage']
    const missing = required.filter((field) => !body[field as keyof ErrorReport])

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify feedId exists if provided
    if (body.feedId) {
      const feed = await prisma.feed.findUnique({
        where: { id: body.feedId },
      })
      if (!feed) {
        // Don't fail, just log and continue without feed relation
        console.warn(`Feed ${body.feedId} not found, creating error without feed relation`)
        body.feedId = undefined
      }
    }

    // Create error record
    const error = await prisma.n8nError.create({
      data: {
        workflowId: body.workflowId,
        workflowName: body.workflowName,
        executionId: body.executionId,
        nodeId: body.nodeId,
        nodeName: body.nodeName,
        errorType: body.errorType,
        errorMessage: body.errorMessage,
        feedId: body.feedId,
        context: body.context ? JSON.stringify(body.context) : null,
        resolved: false,
      },
    })

    return NextResponse.json({
      success: true,
      errorId: error.id,
      message: 'Error recorded successfully',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error recording n8n error:', error)
    return NextResponse.json(
      { error: 'Failed to record error', details: message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/n8n/errors
 * Returns recent errors for System Health monitoring
 *
 * Query params:
 * - resolved: filter by resolved status (true/false)
 * - limit: max number of errors to return (default 50)
 * - workflowName: filter by workflow name
 * - feedId: filter by related feed
 */
export async function GET(request: NextRequest) {
  // Validate API key
  const authError = requireN8nAuth(request)
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const resolved = searchParams.get('resolved')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const workflowName = searchParams.get('workflowName')
    const feedId = searchParams.get('feedId')

    // Build filter conditions
    const where: Record<string, unknown> = {}

    if (resolved !== null) {
      where.resolved = resolved === 'true'
    }

    if (workflowName) {
      where.workflowName = workflowName
    }

    if (feedId) {
      where.feedId = feedId
    }

    const errors = await prisma.n8nError.findMany({
      where,
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100), // Cap at 100
    })

    // Get summary stats
    const stats = await prisma.n8nError.groupBy({
      by: ['resolved'],
      _count: true,
    })

    const unresolvedCount = stats.find((s) => !s.resolved)?._count || 0
    const resolvedCount = stats.find((s) => s.resolved)?._count || 0

    return NextResponse.json({
      success: true,
      count: errors.length,
      stats: {
        unresolved: unresolvedCount,
        resolved: resolvedCount,
        total: unresolvedCount + resolvedCount,
      },
      errors: errors.map((e) => ({
        ...e,
        context: e.context ? JSON.parse(e.context) : null,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error fetching n8n errors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch errors', details: message },
      { status: 500 }
    )
  }
}
