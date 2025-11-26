import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { testFeedUrl } from '@/lib/feedHealthService'

interface DetectionResult {
  platform: 'substack' | 'medium' | 'twitter' | 'rss' | 'unknown'
  author?: string
  feedUrl?: string
  profileUrl?: string
  detected: boolean
}

/**
 * POST /api/feeds/add-from-url
 *
 * Unified endpoint for adding feeds from any URL.
 * Combines detection + creation in one call.
 * Extension-ready with API key authentication support.
 *
 * Body:
 * - url: The URL to add (author page, profile, or feed URL) - required
 * - name: Optional name override (otherwise auto-detected)
 * - priority: Optional priority (default: 50)
 * - category: Optional category (default: "tech")
 *
 * Headers:
 * - Authorization: Bearer <EMBER_API_KEY> (optional, for external clients)
 *
 * Returns:
 * - success: Boolean
 * - feed: The created feed object
 * - already_exists: Boolean if feed URL already exists
 * - detection: Detection details
 * - message: Human-readable message
 */
export async function POST(request: Request) {
  try {
    // Optional API key authentication for external clients (Chrome extension)
    const apiKey = process.env.EMBER_API_KEY
    if (apiKey) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader !== `Bearer ${apiKey}`) {
        return NextResponse.json(
          { error: 'Unauthorized', success: false },
          { status: 401 }
        )
      }
    }

    const body = await request.json()
    const { url, name: providedName, priority = 50, category = 'tech' } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required', success: false },
        { status: 400 }
      )
    }

    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    // Detect platform and feed URL
    const detection = await detectPlatform(normalizedUrl)

    // Use detected feed URL or original URL
    const feedUrl = detection.feedUrl || normalizedUrl
    const feedName = providedName || detection.author || extractNameFromUrl(normalizedUrl)
    const feedType = mapPlatformToType(detection.platform)

    // Check if feed URL already exists
    const existing = await prisma.feed.findUnique({
      where: { url: feedUrl }
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        already_exists: true,
        feed: existing,
        detection,
        message: `Feed "${existing.name}" already exists`,
      })
    }

    // Test the feed
    const testResult = await testFeedUrl(feedUrl)

    if (!testResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Feed test failed',
          details: testResult.error,
          detection,
          feedUrl,
          suggestion: 'The detected feed URL could not be accessed. Please verify it exists.',
        },
        { status: 400 }
      )
    }

    // Create the feed
    const feed = await prisma.feed.create({
      data: {
        name: feedName,
        url: feedUrl,
        type: feedType,
        category,
        priority: Math.max(0, Math.min(100, priority)),
        status: 'active',
        consecutiveFailures: 0,
        enabled: true,
      },
    })

    return NextResponse.json({
      success: true,
      already_exists: false,
      feed,
      detection,
      message: `Feed "${feedName}" added successfully from ${detection.platform}`,
      testResult: {
        articlesFound: testResult.articlesCount,
      },
    })
  } catch (error) {
    console.error('Add from URL error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to add feed', details: message, success: false },
      { status: 500 }
    )
  }
}

async function detectPlatform(url: string): Promise<DetectionResult> {
  const patterns = {
    substack: /^https?:\/\/([a-z0-9-]+)\.substack\.com/i,
    mediumAuthor: /^https?:\/\/medium\.com\/@([a-z0-9_-]+)/i,
    mediumCustom: /^https?:\/\/([a-z0-9-]+)\.medium\.com/i,
    twitter: /^https?:\/\/(twitter|x)\.com\/([a-z0-9_]+)/i,
    devto: /^https?:\/\/dev\.to\/([a-z0-9_-]+)/i,
    hashnode: /^https?:\/\/([a-z0-9-]+)\.hashnode\.dev/i,
  }

  // Check Substack
  const substackMatch = url.match(patterns.substack)
  if (substackMatch) {
    const author = substackMatch[1]
    return {
      platform: 'substack',
      author,
      feedUrl: `https://${author}.substack.com/feed`,
      profileUrl: `https://${author}.substack.com`,
      detected: true,
    }
  }

  // Check Medium (@author)
  const mediumAuthorMatch = url.match(patterns.mediumAuthor)
  if (mediumAuthorMatch) {
    const author = mediumAuthorMatch[1]
    return {
      platform: 'medium',
      author,
      feedUrl: `https://medium.com/feed/@${author}`,
      profileUrl: `https://medium.com/@${author}`,
      detected: true,
    }
  }

  // Check Medium (subdomain)
  const mediumCustomMatch = url.match(patterns.mediumCustom)
  if (mediumCustomMatch) {
    const author = mediumCustomMatch[1]
    return {
      platform: 'medium',
      author,
      feedUrl: `https://medium.com/feed/@${author}`,
      profileUrl: `https://${author}.medium.com`,
      detected: true,
    }
  }

  // Check Twitter/X
  const twitterMatch = url.match(patterns.twitter)
  if (twitterMatch) {
    const author = twitterMatch[2]
    return {
      platform: 'twitter',
      author,
      feedUrl: `https://nitter.net/${author}/rss`,
      profileUrl: `https://twitter.com/${author}`,
      detected: true,
    }
  }

  // Check Dev.to
  const devtoMatch = url.match(patterns.devto)
  if (devtoMatch) {
    const author = devtoMatch[1]
    return {
      platform: 'rss',
      author,
      feedUrl: `https://dev.to/feed/${author}`,
      profileUrl: `https://dev.to/${author}`,
      detected: true,
    }
  }

  // Check Hashnode
  const hashnodeMatch = url.match(patterns.hashnode)
  if (hashnodeMatch) {
    const author = hashnodeMatch[1]
    return {
      platform: 'rss',
      author,
      feedUrl: `https://${author}.hashnode.dev/rss.xml`,
      profileUrl: `https://${author}.hashnode.dev`,
      detected: true,
    }
  }

  // Check if already a feed URL
  if (url.includes('/feed') || url.includes('/rss') || url.endsWith('.xml')) {
    return {
      platform: 'rss',
      feedUrl: url,
      profileUrl: url.replace(/\/(feed|rss)(\.xml)?$/, ''),
      detected: true,
    }
  }

  // Unknown
  return {
    platform: 'unknown',
    feedUrl: url,
    profileUrl: url,
    detected: false,
  }
}

function mapPlatformToType(platform: string): string {
  const mapping: Record<string, string> = {
    substack: 'substack',
    medium: 'medium',
    twitter: 'rss', // Nitter is RSS
    rss: 'rss',
    unknown: 'rss',
  }
  return mapping[platform] || 'rss'
}

function extractNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Get hostname without www
    let name = parsed.hostname.replace(/^www\./, '')
    // Capitalize first letter
    name = name.charAt(0).toUpperCase() + name.slice(1)
    return name
  } catch {
    return 'Unknown Feed'
  }
}

// CORS for Chrome extension support
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
