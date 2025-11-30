import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Article data from n8n workflow
 */
interface IngestArticle {
  title: string
  url: string
  description: string
  source: string
  feedId?: string
  publishedAt: string
  author?: string
  imageUrl?: string
  tags?: string[]
  score?: number
}

/**
 * POST /api/n8n/ingest
 * Accepts articles from n8n workflows and upserts them to the database
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { source, workflowId, articles } = body as {
      source: string
      workflowId: string
      articles: IngestArticle[]
    }

    // Validate required fields
    if (!source || source !== 'n8n') {
      return NextResponse.json(
        { error: 'Invalid source. Must be "n8n"' },
        { status: 400 }
      )
    }

    if (!workflowId) {
      return NextResponse.json(
        { error: 'workflowId is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json(
        { error: 'articles array is required and must not be empty' },
        { status: 400 }
      )
    }

    let inserted = 0
    let duplicates = 0
    let errors = 0
    const errorDetails: string[] = []

    // Process articles in batches
    for (const article of articles) {
      try {
        // Validate required article fields
        if (!article.title || !article.url) {
          errors++
          errorDetails.push(`Missing title or URL for article`)
          continue
        }

        // Validate URL format
        try {
          new URL(article.url)
        } catch {
          errors++
          errorDetails.push(`Invalid URL: ${article.url}`)
          continue
        }

        // Parse published date
        const publishedAt = article.publishedAt
          ? new Date(article.publishedAt)
          : new Date()

        if (isNaN(publishedAt.getTime())) {
          errors++
          errorDetails.push(`Invalid date for: ${article.url}`)
          continue
        }

        // Upsert article (insert or skip if exists)
        await prisma.article.upsert({
          where: { url: article.url },
          update: {
            // Only update score if provided and higher
            score: article.score !== undefined ? article.score : undefined,
          },
          create: {
            title: article.title,
            description: article.description || '',
            url: article.url,
            source: article.source || 'n8n',
            score: article.score || 0,
            publishedAt,
          },
        })

        inserted++
      } catch (error) {
        // Check if it's a duplicate error (unique constraint)
        if (
          error instanceof Error &&
          error.message.includes('Unique constraint')
        ) {
          duplicates++
        } else {
          errors++
          const msg = error instanceof Error ? error.message : 'Unknown error'
          errorDetails.push(`Error processing ${article.url}: ${msg}`)
        }
      }
    }

    // Update feed lastFetched if feedId was provided
    const feedIds = [...new Set(articles.map((a) => a.feedId).filter(Boolean))]
    if (feedIds.length > 0) {
      await prisma.feed.updateMany({
        where: { id: { in: feedIds as string[] } },
        data: { lastFetched: new Date() },
      })
    }

    return NextResponse.json({
      success: true,
      workflowId,
      stats: {
        received: articles.length,
        inserted,
        duplicates,
        errors,
      },
      ...(errorDetails.length > 0 && { errorDetails: errorDetails.slice(0, 10) }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error ingesting articles from n8n:', error)
    return NextResponse.json(
      { error: 'Failed to ingest articles', details: message },
      { status: 500 }
    )
  }
}
