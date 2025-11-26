import { NextResponse } from 'next/server'

/**
 * GET /api/authors/search
 *
 * Search for authors by name across Substack and Medium.
 *
 * Query params:
 * - name: Author name to search (required, min 2 chars)
 * - platform: Platform to search ("all", "substack", "medium") (default: "all")
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  const platform = searchParams.get('platform') || 'all'

  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: 'Name parameter is required and must be at least 2 characters' },
      { status: 400 }
    )
  }

  if (!['all', 'substack', 'medium'].includes(platform)) {
    return NextResponse.json(
      { error: 'Platform must be "all", "substack", or "medium"' },
      { status: 400 }
    )
  }

  const aggregatorUrl = process.env.AGGREGATOR_URL || 'http://localhost:8000'

  try {
    const response = await fetch(
      `${aggregatorUrl}/api/authors/search?name=${encodeURIComponent(name)}&platform=${platform}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to search authors' },
        { status: response.status }
      )
    }

    return NextResponse.json(await response.json())
  } catch (error) {
    console.error('Author search error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to aggregator service' },
      { status: 503 }
    )
  }
}
