import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/thoughts/:id - Update thought (text, category, categoryFields)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { text, category, categoryFields } = body

    // Build update data object
    const updateData: any = {}
    if (text !== undefined) {
      if (text.trim().length === 0) {
        return NextResponse.json(
          { error: 'Thought text cannot be empty' },
          { status: 400 }
        )
      }
      updateData.text = text.trim()
    }
    if (category !== undefined) {
      updateData.category = category?.trim() || null
    }
    if (categoryFields !== undefined) {
      updateData.categoryFields = categoryFields || null
    }

    const thought = await prisma.thought.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(thought)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error updating thought:', error)

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Thought not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update thought', details: message },
      { status: 500 }
    )
  }
}

// DELETE /api/thoughts/:id - Delete a thought
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.thought.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error deleting thought:', error)

    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Thought not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete thought', details: message },
      { status: 500 }
    )
  }
}
