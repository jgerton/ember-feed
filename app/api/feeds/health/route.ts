import { NextResponse } from 'next/server'
import { getFeedHealthSummary } from '@/lib/feedHealthService'

// GET /api/feeds/health - Get feed health summary
export async function GET() {
  try {
    const summary = await getFeedHealthSummary()
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error getting feed health summary:', error)
    return NextResponse.json(
      { error: 'Failed to get feed health summary' },
      { status: 500 }
    )
  }
}
