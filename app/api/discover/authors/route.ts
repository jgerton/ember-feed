import { NextResponse } from 'next/server'

/**
 * GET /api/discover/authors
 *
 * Discover popular authors on Substack and Medium.
 *
 * Query params:
 * - category: Category to discover authors for (default: "technology")
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || 'technology'

  const aggregatorUrl = process.env.AGGREGATOR_URL || 'http://localhost:8000'

  try {
    const response = await fetch(
      `${aggregatorUrl}/api/discover/authors?category=${encodeURIComponent(category)}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 600 }, // Cache for 10 minutes
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to discover authors' },
        { status: response.status }
      )
    }

    return NextResponse.json(await response.json())
  } catch (error) {
    console.error('Author discovery error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to aggregator service' },
      { status: 503 }
    )
  }
}
