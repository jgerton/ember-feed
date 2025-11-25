import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/feeds/add-test - Add a bad feed for testing
export async function POST() {
  try {
    const badFeed = await prisma.feed.create({
      data: {
        name: 'Bad Feed (Test)',
        url: 'https://invalid-url-that-does-not-exist.example.com/rss',
        type: 'rss',
        category: 'tech',
        priority: 50,
        status: 'active',
        enabled: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Bad feed added for testing',
      feed: badFeed
    })
  } catch (error) {
    console.error('Error adding bad feed:', error)
    return NextResponse.json(
      { error: 'Failed to add bad feed' },
      { status: 500 }
    )
  }
}
