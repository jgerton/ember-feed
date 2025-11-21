import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/todos/[id] - Update a todo
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()
    const { text, completed } = body

    const updateData: { text?: string; completed?: boolean } = {}
    if (text !== undefined) updateData.text = text
    if (completed !== undefined) updateData.completed = completed

    const todo = await prisma.todo.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json(todo)
  } catch (error) {
    console.error('Error updating todo:', error)
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    )
  }
}

// DELETE /api/todos/[id] - Delete a todo
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    await prisma.todo.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting todo:', error)
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    )
  }
}
