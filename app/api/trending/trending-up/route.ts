/**
 * Trending Topics - Trending Up Endpoint
 *
 * Get "Trending Up" topics (velocity-based, gaining momentum)
 * GET /api/trending/trending-up?timeframe=7day&limit=5
 */

import { NextRequest, NextResponse } from 'next/server';

const AGGREGATOR_URL = process.env.AGGREGATOR_URL || 'http://aggregator:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '7day';
    const limit = searchParams.get('limit') || '5';

    // Validate timeframe
    if (!['7day', '14day', '30day'].includes(timeframe)) {
      return NextResponse.json(
        { error: 'timeframe must be one of: 7day, 14day, 30day' },
        { status: 400 }
      );
    }

    // Proxy request to aggregator service
    const response = await fetch(
      `${AGGREGATOR_URL}/api/trending-up?timeframe=${timeframe}&limit=${limit}`,
      {
        // Cache for 30 minutes (1800 seconds)
        next: { revalidate: 1800 },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Trending up fetch failed:', error);
      return NextResponse.json(
        { error: 'Failed to fetch trending up topics' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Trending up error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
