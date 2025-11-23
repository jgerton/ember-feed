import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/log/[id] - Update a log entry
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { type, content, tags } = body

    const updateData: {
      type?: string
      content?: string
      tags?: string | null
    } = {}

    if (type !== undefined) {
      const validTypes = ['discovery', 'blocker', 'accomplishment', 'thought']
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.type = type
    }

    if (content !== undefined) updateData.content = content

    if (tags !== undefined) {
      updateData.tags = tags && Array.isArray(tags) ? JSON.stringify(tags) : null
    }

    const entry = await prisma.logEntry.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json({
      ...entry,
      tags: entry.tags ? JSON.parse(entry.tags) : []
    })
  } catch (error) {
    console.error('Error updating log entry:', error)
    return NextResponse.json(
      { error: 'Failed to update log entry' },
      { status: 500 }
    )
  }
}

// DELETE /api/log/[id] - Delete a log entry
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    await prisma.logEntry.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting log entry:', error)
    return NextResponse.json(
      { error: 'Failed to delete log entry' },
      { status: 500 }
    )
  }
}
