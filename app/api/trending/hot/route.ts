/**
 * Trending Topics - Hot Now Endpoint
 *
 * Get "Hot Now" trending topics (high engagement + recency)
 * GET /api/trending/hot?timeframe=24hr&limit=5
 */

import { NextRequest, NextResponse } from 'next/server';

const AGGREGATOR_URL = process.env.AGGREGATOR_URL || 'http://aggregator:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24hr';
    const limit = searchParams.get('limit') || '5';

    // Validate timeframe
    if (!['24hr', '3day', '7day'].includes(timeframe)) {
      return NextResponse.json(
        { error: 'timeframe must be one of: 24hr, 3day, 7day' },
        { status: 400 }
      );
    }

    // Proxy request to aggregator service
    const response = await fetch(
      `${AGGREGATOR_URL}/api/hot?timeframe=${timeframe}&limit=${limit}`,
      {
        // Cache for 15 minutes (900 seconds)
        next: { revalidate: 900 },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Hot topics fetch failed:', error);
      return NextResponse.json(
        { error: 'Failed to fetch hot topics' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Hot topics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
