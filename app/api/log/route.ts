import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/log - Get log entries with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const tag = searchParams.get('tag')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')

    const where: {
      type?: string
      tags?: { contains: string }
      OR?: Array<{ content: { contains: string } }>
    } = {}

    if (type) {
      where.type = type
    }

    if (tag) {
      where.tags = { contains: tag }
    }

    if (search) {
      where.OR = [
        { content: { contains: search } }
      ]
    }

    const entries = await prisma.logEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Parse tags from JSON string to array
    const entriesWithParsedTags = entries.map(entry => ({
      ...entry,
      tags: entry.tags ? JSON.parse(entry.tags) : []
    }))

    return NextResponse.json(entriesWithParsedTags)
  } catch (error) {
    console.error('Error fetching log entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch log entries' },
      { status: 500 }
    )
  }
}

// POST /api/log - Create new log entry
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, content, tags } = body

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Type and content are required' },
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ['discovery', 'blocker', 'accomplishment', 'thought']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const entry = await prisma.logEntry.create({
      data: {
        type,
        content,
        tags: tags && Array.isArray(tags) ? JSON.stringify(tags) : null
      }
    })

    return NextResponse.json({
      ...entry,
      tags: entry.tags ? JSON.parse(entry.tags) : []
    })
  } catch (error) {
    console.error('Error creating log entry:', error)
    return NextResponse.json(
      { error: 'Failed to create log entry' },
      { status: 500 }
    )
  }
}
