import { NextResponse } from 'next/server'
import { testFeedUrl } from '@/lib/feedHealthService'

// POST /api/feeds/validate - Test a feed URL without adding it
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: 'URL is required',
          suggestion: 'Please provide a feed URL to validate'
        },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid URL protocol',
            suggestion: 'Please use http:// or https:// URLs'
          },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid URL format',
          suggestion: 'Please enter a valid http:// or https:// URL'
        },
        { status: 400 }
      )
    }

    // Test the feed
    const testResult = await testFeedUrl(url)

    if (!testResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: testResult.error || 'Feed validation failed',
          suggestion: testResult.error?.includes('fetch')
            ? 'The feed URL may be incorrect or the server is not responding. Please verify the URL and try again.'
            : testResult.error?.includes('parse')
            ? 'The URL does not contain valid RSS/Atom feed content. Please check if this is the correct feed URL.'
            : 'Please verify the RSS feed URL is valid and accessible'
        },
        { status: 400 }
      )
    }

    // Return success with feed details
    return NextResponse.json({
      success: true,
      feedName: testResult.feedTitle || 'Unknown Feed',
      articlesCount: testResult.articlesCount || 0,
      message: 'Feed is valid and ready to add'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error validating feed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate feed',
        details: message,
        suggestion: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}
