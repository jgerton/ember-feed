import { NextResponse } from 'next/server'

/**
 * POST /api/n8n/trigger-collector
 * Triggers the feed collector workflow via n8n webhook
 *
 * This endpoint calls n8n's webhook to manually start the RSS feed collector.
 * Normally it runs on a 15-minute schedule, but this allows manual triggering.
 */
export async function POST() {
  try {
    // Get n8n webhook URL from environment
    const n8nWebhookUrl = process.env.N8N_COLLECTOR_WEBHOOK_URL || 'http://n8n:5678/webhook/feed-collector'

    // Check if n8n is available
    const n8nAvailable = process.env.N8N_ENABLED !== 'false'

    if (!n8nAvailable) {
      return NextResponse.json({
        success: false,
        message: 'n8n is not enabled. Set N8N_ENABLED=true to enable.',
      })
    }

    try {
      // Call n8n webhook to trigger the feed collector workflow
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          triggeredAt: new Date().toISOString(),
          source: 'ember-feed-manual',
          manual: true,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json(
          {
            success: false,
            error: 'n8n webhook call failed',
            status: response.status,
            details: errorText,
          },
          { status: 502 }
        )
      }

      const result = await response.json().catch(() => ({}))

      return NextResponse.json({
        success: true,
        message: 'Feed collector workflow triggered successfully',
        executionId: result.executionId,
      })
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Unknown error'

      // In development, return a helpful message
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: false,
          message: 'Could not reach n8n. Make sure n8n is running and the webhook is configured.',
          details: message,
          hint: 'The feed collector workflow needs a webhook trigger node configured at /webhook/feed-collector',
        })
      }

      return NextResponse.json(
        { success: false, error: 'Failed to trigger n8n workflow', details: message },
        { status: 502 }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error triggering feed collector:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process request', details: message },
      { status: 500 }
    )
  }
}
