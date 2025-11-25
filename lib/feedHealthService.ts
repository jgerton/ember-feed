import { prisma } from './db'
import Parser from 'rss-parser'

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media'],
      ['content:encoded', 'contentEncoded'],
    ]
  }
})

const FAILURE_THRESHOLDS = {
  FAILING: 3,       // Mark as "failing" after 3 consecutive failures
  QUARANTINE: 10    // Quarantine after 10 consecutive failures
}

const QUARANTINE_BACKOFF_HOURS = 24 // Don't retry quarantined feeds for 24 hours

interface FeedHealthResult {
  feedId: string
  name: string
  status: string
  success: boolean
  error?: string
  articlesCount?: number
}

/**
 * Initialize default RSS feeds in database if they don't exist
 */
export async function initializeDefaultFeeds() {
  const defaultFeeds = [
    { name: 'Hacker News', url: 'https://hnrss.org/frontpage', priority: 90 },
    { name: 'Reddit /r/technology', url: 'https://www.reddit.com/r/technology/.rss', priority: 70 },
    { name: 'Dev.to', url: 'https://dev.to/feed', priority: 80 }
  ]

  for (const feedData of defaultFeeds) {
    await prisma.feed.upsert({
      where: { url: feedData.url },
      update: {},
      create: {
        ...feedData,
        type: 'rss',
        category: 'tech',
        enabled: true
      }
    })
  }

  return await prisma.feed.findMany()
}

/**
 * Get feeds that should be synced (not quarantined or on backoff)
 */
export async function getActiveFeedsForSync() {
  const feeds = await prisma.feed.findMany({
    where: {
      enabled: true,
      OR: [
        { status: 'active' },
        { status: 'failing' }
      ]
    },
    orderBy: { priority: 'desc' }
  })

  // Filter out failing feeds that should be backed off
  return feeds.filter(feed => {
    if (feed.status === 'failing') {
      // Exponential backoff: wait longer for each consecutive failure
      const backoffMinutes = Math.min(
        Math.pow(2, feed.consecutiveFailures - FAILURE_THRESHOLDS.FAILING),
        60 // Cap at 1 hour
      )

      if (feed.lastFailureAt) {
        const minutesSinceFailure = (Date.now() - feed.lastFailureAt.getTime()) / (1000 * 60)
        if (minutesSinceFailure < backoffMinutes) {
          console.log(`Backing off feed ${feed.name} for ${backoffMinutes} minutes`)
          return false
        }
      }
    }

    return true
  })
}

/**
 * Test a URL directly (for validation before adding)
 */
export async function testFeedUrl(url: string): Promise<Omit<FeedHealthResult, 'feedId' | 'name'> & { feedTitle?: string }> {
  try {
    const parsed = await parser.parseURL(url)

    return {
      status: 'success',
      success: true,
      articlesCount: parsed.items.length,
      feedTitle: parsed.title
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return {
      status: 'failed',
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Test a single feed (for manual testing/restore)
 */
export async function testFeed(feedId: string): Promise<FeedHealthResult> {
  const feed = await prisma.feed.findUnique({ where: { id: feedId } })
  if (!feed) {
    throw new Error(`Feed ${feedId} not found`)
  }

  try {
    const parsed = await parser.parseURL(feed.url)

    return {
      feedId: feed.id,
      name: feed.name,
      status: 'success',
      success: true,
      articlesCount: parsed.items.length
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return {
      feedId: feed.id,
      name: feed.name,
      status: 'failed',
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Record successful feed sync
 */
export async function recordFeedSuccess(feedId: string, articlesCount: number) {
  await prisma.feed.update({
    where: { id: feedId },
    data: {
      status: 'active',
      consecutiveFailures: 0,
      lastSuccessAt: new Date(),
      lastErrorMessage: null
    }
  })

  console.log(`✓ Feed success: ${feedId} (${articlesCount} articles)`)
}

/**
 * Record feed failure with graceful degradation
 */
export async function recordFeedFailure(feedId: string, error: string) {
  const feed = await prisma.feed.findUnique({ where: { id: feedId } })
  if (!feed) return

  const newFailureCount = feed.consecutiveFailures + 1
  let newStatus = feed.status

  // Update status based on failure count
  if (newFailureCount >= FAILURE_THRESHOLDS.QUARANTINE) {
    newStatus = 'quarantined'
    console.warn(`⚠️  Feed QUARANTINED: ${feed.name} (${newFailureCount} failures)`)
  } else if (newFailureCount >= FAILURE_THRESHOLDS.FAILING) {
    newStatus = 'failing'
    console.warn(`⚠️  Feed FAILING: ${feed.name} (${newFailureCount} failures, exponential backoff)`)
  } else {
    console.warn(`⚠️  Feed temporary failure: ${feed.name} (${newFailureCount} failures)`)
  }

  await prisma.feed.update({
    where: { id: feedId },
    data: {
      status: newStatus,
      consecutiveFailures: newFailureCount,
      lastFailureAt: new Date(),
      lastErrorMessage: error.substring(0, 500) // Limit error message length
    }
  })
}

/**
 * Restore a quarantined feed (manual action)
 */
export async function restoreFeed(feedId: string) {
  // First test the feed
  const testResult = await testFeed(feedId)

  if (testResult.success) {
    await prisma.feed.update({
      where: { id: feedId },
      data: {
        status: 'active',
        consecutiveFailures: 0,
        lastSuccessAt: new Date(),
        lastErrorMessage: null
      }
    })

    return { success: true, message: `Feed restored: ${testResult.name}` }
  } else {
    return { success: false, message: `Feed still failing: ${testResult.error}` }
  }
}

/**
 * Get feed health summary
 */
export async function getFeedHealthSummary() {
  const feeds = await prisma.feed.findMany({
    orderBy: { priority: 'desc' }
  })

  const summary = {
    total: feeds.length,
    active: feeds.filter(f => f.status === 'active').length,
    failing: feeds.filter(f => f.status === 'failing').length,
    quarantined: feeds.filter(f => f.status === 'quarantined').length,
    feeds: feeds.map(f => ({
      id: f.id,
      name: f.name,
      url: f.url,
      status: f.status,
      consecutiveFailures: f.consecutiveFailures,
      lastSuccessAt: f.lastSuccessAt,
      lastFailureAt: f.lastFailureAt,
      lastErrorMessage: f.lastErrorMessage,
      priority: f.priority
    }))
  }

  return summary
}

/**
 * Get quarantined feeds (for admin UI)
 */
export async function getQuarantinedFeeds() {
  return await prisma.feed.findMany({
    where: { status: 'quarantined' },
    orderBy: { lastFailureAt: 'desc' }
  })
}
