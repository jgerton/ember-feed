import Parser from 'rss-parser'
import { prisma } from './db'
import {
  getActiveFeedsForSync,
  recordFeedSuccess,
  recordFeedFailure,
  initializeDefaultFeeds
} from './feedHealthService'

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media'],
      ['content:encoded', 'contentEncoded'],
    ]
  }
})

interface FeedItem {
  title: string
  link: string
  contentSnippet?: string
  isoDate?: string
  source: string
}

export async function fetchAllFeeds(): Promise<FeedItem[]> {
  // Initialize default feeds if database is empty
  const feedCount = await prisma.feed.count()
  if (feedCount === 0) {
    await initializeDefaultFeeds()
  }

  const allItems: FeedItem[] = []
  const feeds = await getActiveFeedsForSync()

  for (const feed of feeds) {
    try {
      const parsed = await parser.parseURL(feed.url)

      const items = parsed.items.slice(0, 10).map(item => ({
        title: item.title || 'Untitled',
        link: item.link || '',
        contentSnippet: item.contentSnippet || item.content?.substring(0, 200) || '',
        isoDate: item.isoDate,
        source: feed.name
      }))

      allItems.push(...items)

      // Record success
      await recordFeedSuccess(feed.id, items.length)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Failed to fetch feed ${feed.name}:`, errorMessage)

      // Record failure with graceful degradation
      await recordFeedFailure(feed.id, errorMessage)
    }
  }

  return allItems
}

export async function syncArticlesToDatabase() {
  const feedItems = await fetchAllFeeds()
  let newCount = 0
  let updatedCount = 0

  for (const item of feedItems) {
    if (!item.link) continue

    try {
      const existing = await prisma.article.findUnique({
        where: { url: item.link }
      })

      if (existing) {
        // Article exists, potentially update score
        updatedCount++
      } else {
        // Create new article
        await prisma.article.create({
          data: {
            title: item.title,
            description: item.contentSnippet || '',
            url: item.link,
            source: item.source,
            score: calculateInitialScore(item),
            publishedAt: item.isoDate ? new Date(item.isoDate) : new Date()
          }
        })
        newCount++
      }
    } catch (error) {
      console.error(`Failed to sync article ${item.link}:`, error)
    }
  }

  return { newCount, updatedCount, total: feedItems.length }
}

function calculateInitialScore(item: FeedItem): number {
  // Simple initial scoring based on source and recency
  let score = 50 // Base score

  // Source bonuses
  if (item.source === 'Hacker News') score += 20
  if (item.source === 'Dev.to') score += 15
  if (item.source === 'Reddit') score += 10

  // Recency bonus (newer = higher score)
  if (item.isoDate) {
    const ageInHours = (Date.now() - new Date(item.isoDate).getTime()) / (1000 * 60 * 60)
    if (ageInHours < 6) score += 20
    else if (ageInHours < 24) score += 10
    else if (ageInHours < 48) score += 5
  }

  return Math.min(100, score)
}
