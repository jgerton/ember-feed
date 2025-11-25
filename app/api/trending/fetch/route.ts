/**
 * Trending Topics - Fetch Endpoint
 *
 * Triggers content fetching from aggregator service
 * POST /api/trending/fetch
 */

import { NextRequest, NextResponse } from 'next/server';

const AGGREGATOR_URL = process.env.AGGREGATOR_URL || 'http://aggregator:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Proxy request to aggregator service
    const response = await fetch(`${AGGREGATOR_URL}/api/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Aggregator fetch failed:', error);
      return NextResponse.json(
        { error: 'Failed to trigger fetch' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Trending fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Validate jobId format to prevent SSRF attacks
// Only allow alphanumeric characters, hyphens, and underscores (typical for UUIDs and job IDs)
function isValidJobId(jobId: string): boolean {
  const validJobIdPattern = /^[a-zA-Z0-9_-]{1,64}$/;
  return validJobIdPattern.test(jobId);
}

// GET to check job status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId query parameter required' },
        { status: 400 }
      );
    }

    // Validate jobId format to prevent SSRF/path traversal attacks
    if (!isValidJobId(jobId)) {
      return NextResponse.json(
        { error: 'Invalid jobId format' },
        { status: 400 }
      );
    }

    // Proxy request to aggregator service (jobId is now validated)
    const response = await fetch(`${AGGREGATOR_URL}/api/fetch/${encodeURIComponent(jobId)}`);

    if (!response.ok) {
      const error = await response.text();
      console.error('Job status check failed:', error);
      return NextResponse.json(
        { error: 'Failed to get job status' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Job status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
