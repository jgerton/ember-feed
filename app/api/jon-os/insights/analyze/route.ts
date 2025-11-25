/**
 * Jon-OS Content Analysis API
 *
 * POST /api/jon-os/insights/analyze - Analyze specific content for patterns
 *
 * Request Body:
 * - content: The text content to analyze (required)
 */

import { NextResponse } from 'next/server'
import { analyzeContent } from '@/lib/insightsService'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { content } = body

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'content is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Analyze content
    const analysis = await analyzeContent(content.trim())

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error analyzing content:', error)
    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    )
  }
}
