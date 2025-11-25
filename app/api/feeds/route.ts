import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { testFeedUrl } from '@/lib/feedHealthService'

// GET /api/feeds - List all RSS feeds
export async function GET() {
  try {
    const feeds = await prisma.rssFeed.findMany({
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(feeds)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error listing feeds:', error)
    return NextResponse.json(
      { error: 'Failed to list feeds', details: message },
      { status: 500 }
    )
  }
}

// POST /api/feeds - Create a new RSS feed
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, url, priority = 50 } = body

    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Check if URL already exists
    const existing = await prisma.rssFeed.findUnique({
      where: { url }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Feed URL already exists' },
        { status: 409 }
      )
    }

    // Test the feed first
    const testResult = await testFeedUrl(url)

    if (!testResult.success) {
      return NextResponse.json(
        {
          error: 'Feed test failed',
          details: testResult.error,
          suggestion: 'Please verify the RSS feed URL is valid and accessible'
        },
        { status: 400 }
      )
    }

    // Create the feed
    const feed = await prisma.rssFeed.create({
      data: {
        name,
        url,
        priority: Math.max(0, Math.min(100, priority)), // Clamp between 0-100
        status: 'active',
        consecutiveFailures: 0
      }
    })

    return NextResponse.json({
      success: true,
      message: `Feed "${name}" added successfully`,
      feed,
      testResult: {
        articlesFound: testResult.articlesCount
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error creating feed:', error)
    return NextResponse.json(
      { error: 'Failed to create feed', details: message },
      { status: 500 }
    )
  }
}
