import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractTopicsWithThreshold } from '@/lib/topicExtraction'

// POST /api/topics/extract - Extract topics for articles
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { articleIds } = body

    // If no article IDs provided, process all articles without topics
    let articles
    if (articleIds && Array.isArray(articleIds)) {
      articles = await prisma.article.findMany({
        where: { id: { in: articleIds } },
        select: {
          id: true,
          title: true,
          description: true
        }
      })
    } else {
      // Find articles that don't have topics yet
      articles = await prisma.article.findMany({
        where: {
          topics: {
            none: {}
          }
        },
        select: {
          id: true,
          title: true,
          description: true
        },
        take: 50 // Process max 50 at a time
      })
    }

    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No articles to process',
        processed: 0
      })
    }

    const results = []

    for (const article of articles) {
      // Extract topics
      const extractedTopics = extractTopicsWithThreshold(
        article.title,
        article.description,
        0.3 // minimum 30% relevance
      )

      if (extractedTopics.length === 0) {
        results.push({
          articleId: article.id,
          topics: [],
          message: 'No relevant topics found'
        })
        continue
      }

      // Create or find topics and link to article
      const topicLinks = []

      for (const topicData of extractedTopics) {
        // Find or create topic
        const topic = await prisma.topic.upsert({
          where: { slug: topicData.slug },
          update: {},
          create: {
            name: topicData.name,
            slug: topicData.slug
          }
        })

        // Create article-topic link if it doesn't exist
        try {
          const link = await prisma.articleTopic.create({
            data: {
              articleId: article.id,
              topicId: topic.id,
              relevance: topicData.relevance
            }
          })
          topicLinks.push({
            topicName: topic.name,
            relevance: topicData.relevance
          })
        } catch (error) {
          // Link already exists, skip
          if (error instanceof Error && error.message.includes('Unique constraint')) {
            topicLinks.push({
              topicName: topic.name,
              relevance: topicData.relevance,
              existed: true
            })
          } else {
            throw error
          }
        }
      }

      results.push({
        articleId: article.id,
        articleTitle: article.title,
        topics: topicLinks
      })
    }

    return NextResponse.json({
      success: true,
      processed: articles.length,
      results
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error extracting topics:', error)
    return NextResponse.json(
      { error: 'Failed to extract topics', details: message },
      { status: 500 }
    )
  }
}
