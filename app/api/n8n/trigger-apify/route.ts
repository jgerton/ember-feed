import { NextResponse } from 'next/server'

/**
 * POST /api/n8n/trigger-apify
 * Triggers the on-demand Apify scraper workflow via n8n webhook
 *
 * This endpoint calls n8n's webhook to start the Apify Newsletter Scraper workflow.
 * The workflow will scrape complex sources (newsletters, paywalls) that can't be
 * handled by regular RSS parsing.
 *
 * Cost: Apify runs cost ~$0.03 per run (within free tier limits)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { feedIds, scrapeAll } = body as {
      feedIds?: string[]
      scrapeAll?: boolean
    }

    // Validate input
    if (!feedIds && !scrapeAll) {
      return NextResponse.json(
        { error: 'Either feedIds array or scrapeAll flag is required' },
        { status: 400 }
      )
    }

    // Get n8n webhook URL from environment
    const n8nWebhookUrl = process.env.N8N_APIFY_WEBHOOK_URL || 'http://n8n:5678/webhook/apify-scraper'

    // Check if n8n is available (in development, this might not be running)
    const n8nAvailable = process.env.N8N_ENABLED !== 'false'

    if (!n8nAvailable) {
      return NextResponse.json({
        success: false,
        message: 'n8n is not enabled. Set N8N_ENABLED=true to enable.',
        mock: true,
      })
    }

    try {
      // Call n8n webhook to trigger the Apify workflow
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedIds: feedIds || [],
          scrapeAll: scrapeAll || false,
          triggeredAt: new Date().toISOString(),
          source: 'ember-feed-api',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json(
          {
            error: 'n8n webhook call failed',
            status: response.status,
            details: errorText,
          },
          { status: 502 }
        )
      }

      const result = await response.json()

      return NextResponse.json({
        success: true,
        message: 'Apify scraper workflow triggered successfully',
        executionId: result.executionId,
        feedCount: feedIds?.length || 'all',
      })
    } catch (fetchError) {
      // n8n might not be running or reachable
      const message = fetchError instanceof Error ? fetchError.message : 'Unknown error'

      // In development, return a helpful message
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: false,
          message: 'Could not reach n8n. Make sure n8n is running.',
          details: message,
          hint: 'Run: docker-compose up n8n',
        })
      }

      return NextResponse.json(
        { error: 'Failed to trigger n8n workflow', details: message },
        { status: 502 }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error triggering Apify scraper:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: message },
      { status: 500 }
    )
  }
}
