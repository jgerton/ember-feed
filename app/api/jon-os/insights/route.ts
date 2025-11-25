/**
 * Jon-OS Insights API
 *
 * GET /api/jon-os/insights - Analyze log entries for patterns
 *
 * Query Parameters:
 * - days: Number of days to analyze (default: 30)
 * - limit: Max results per category (default: 5)
 * - type: Filter by entry type (blocker, discovery, accomplishment, thought)
 */

import { NextResponse } from 'next/server'
import { getInsights } from '@/lib/insightsService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse parameters
    const daysParam = searchParams.get('days')
    const limitParam = searchParams.get('limit')
    const type = searchParams.get('type')

    // Validate days
    const days = daysParam ? parseInt(daysParam, 10) : 30
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'days must be a number between 1 and 365' },
        { status: 400 }
      )
    }

    // Validate limit
    const limit = limitParam ? parseInt(limitParam, 10) : 5
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'limit must be a number between 1 and 50' },
        { status: 400 }
      )
    }

    // Validate type if provided
    if (type) {
      const validTypes = ['blocker', 'discovery', 'accomplishment', 'thought']
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `type must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Get insights
    const insights = await getInsights({ days, limit, type: type || undefined })

    return NextResponse.json(insights)
  } catch (error) {
    console.error('Error getting insights:', error)
    return NextResponse.json(
      { error: 'Failed to analyze log entries' },
      { status: 500 }
    )
  }
}
