import { NextResponse } from 'next/server'

/**
 * GET /api/discover
 *
 * Discover trending content from Substack and Medium.
 * Proxies to the Python aggregator service.
 *
 * Query params:
 * - categories: Comma-separated list (default: "technology,programming")
 * - limit: Maximum articles to return (default: 30)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const categories = searchParams.get('categories') || 'technology,programming'
  const limit = searchParams.get('limit') || '30'

  const aggregatorUrl = process.env.AGGREGATOR_URL || 'http://localhost:8000'

  try {
    const response = await fetch(
      `${aggregatorUrl}/api/discover?categories=${encodeURIComponent(categories)}&limit=${limit}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Aggregator error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch discovery content', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Discovery fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to aggregator service' },
      { status: 503 }
    )
  }
}
