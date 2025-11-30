import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/n8n/errors/[id]
 * Mark an error as resolved or update its status
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { resolved } = body as { resolved?: boolean }

    // Check if error exists
    const existing = await prisma.n8nError.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Error not found' },
        { status: 404 }
      )
    }

    // Update error
    const updated = await prisma.n8nError.update({
      where: { id },
      data: {
        resolved: resolved ?? true,
        resolvedAt: resolved !== false ? new Date() : null,
      },
    })

    return NextResponse.json({
      success: true,
      error: updated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error updating n8n error:', error)
    return NextResponse.json(
      { error: 'Failed to update error', details: message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/n8n/errors/[id]
 * Get a specific error by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const error = await prisma.n8nError.findUnique({
      where: { id },
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
    })

    if (!error) {
      return NextResponse.json(
        { error: 'Error not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      error: {
        ...error,
        context: error.context ? JSON.parse(error.context) : null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error fetching n8n error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch error', details: message },
      { status: 500 }
    )
  }
}
