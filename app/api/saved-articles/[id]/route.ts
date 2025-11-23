import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/saved-articles/:id - Update saved article (priority, read status, notes)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { priority, isRead, notes } = body

    // Build update data object
    const updateData: any = {}
    if (priority !== undefined) updateData.priority = priority
    if (isRead !== undefined) {
      updateData.isRead = isRead
      if (isRead) {
        updateData.readAt = new Date()
      } else {
        updateData.readAt = null
      }
    }
    if (notes !== undefined) updateData.notes = notes

    const savedArticle = await prisma.savedArticle.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(savedArticle)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error updating saved article:', error)

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Saved article not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update saved article', details: message },
      { status: 500 }
    )
  }
}

// DELETE /api/saved-articles/:id - Remove from read later queue
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.savedArticle.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error deleting saved article:', error)

    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Saved article not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete saved article', details: message },
      { status: 500 }
    )
  }
}
