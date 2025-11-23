import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/feeds/check - Check if an RSS feed URL exists in subscriptions
 *
 * Request body:
 * {
 *   url: string  // RSS feed URL to check
 * }
 *
 * Response:
 * {
 *   exists: boolean
 *   feed?: {
 *     id: string
 *     name: string
 *     url: string
 *     status: string
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Normalize URL for comparison (remove trailing slashes, etc.)
    const normalizedUrl = url.trim().replace(/\/+$/, '')

    // Check if feed exists in database
    const feed = await prisma.rssFeed.findFirst({
      where: {
        url: {
          equals: normalizedUrl
        }
      },
      select: {
        id: true,
        name: true,
        url: true,
        status: true
      }
    })

    if (feed) {
      return NextResponse.json({
        exists: true,
        feed
      })
    }

    return NextResponse.json({
      exists: false
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error checking feed:', error)

    return NextResponse.json(
      { error: 'Failed to check feed', details: message },
      { status: 500 }
    )
  }
}
