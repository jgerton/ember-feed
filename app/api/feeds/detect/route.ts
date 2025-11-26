import { NextResponse } from 'next/server'

interface DetectionResult {
  platform: 'substack' | 'medium' | 'twitter' | 'rss' | 'unknown'
  author?: string
  feedUrl?: string
  profileUrl?: string
  detected: boolean
  message?: string
}

/**
 * POST /api/feeds/detect
 *
 * Smart URL detection - detects platform and feed URL from author/publication URLs.
 * Used by the Add Feed form to auto-fill feed details when a URL is pasted.
 *
 * Body:
 * - url: The URL to detect (required)
 *
 * Returns:
 * - platform: Detected platform type
 * - author: Detected author/publication name
 * - feedUrl: Detected RSS feed URL
 * - profileUrl: Detected profile/homepage URL
 * - detected: Boolean indicating if detection was successful
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required', detected: false },
        { status: 400 }
      )
    }

    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    const result = await detectPlatform(normalizedUrl)
    return NextResponse.json(result)
  } catch (error) {
    console.error('URL detection error:', error)
    return NextResponse.json(
      { error: 'Failed to detect URL', detected: false },
      { status: 500 }
    )
  }
}

async function detectPlatform(url: string): Promise<DetectionResult> {
  // Pattern matching for different platforms
  const patterns = {
    // Substack: author.substack.com or custom domain pointing to Substack
    substack: /^https?:\/\/([a-z0-9-]+)\.substack\.com/i,

    // Medium: medium.com/@author or author.medium.com
    mediumAuthor: /^https?:\/\/medium\.com\/@([a-z0-9_-]+)/i,
    mediumCustom: /^https?:\/\/([a-z0-9-]+)\.medium\.com/i,

    // Twitter/X: twitter.com/user or x.com/user
    twitter: /^https?:\/\/(twitter|x)\.com\/([a-z0-9_]+)/i,

    // Dev.to: dev.to/username
    devto: /^https?:\/\/dev\.to\/([a-z0-9_-]+)/i,

    // Hashnode: username.hashnode.dev
    hashnode: /^https?:\/\/([a-z0-9-]+)\.hashnode\.dev/i,

    // Ghost blogs: often have /rss/ endpoint
    ghost: /^https?:\/\/[a-z0-9.-]+\/rss\/?$/i,
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
      message: `Detected Substack newsletter: ${author}`,
    }
  }

  // Check Medium (@author format)
  const mediumAuthorMatch = url.match(patterns.mediumAuthor)
  if (mediumAuthorMatch) {
    const author = mediumAuthorMatch[1]
    return {
      platform: 'medium',
      author,
      feedUrl: `https://medium.com/feed/@${author}`,
      profileUrl: `https://medium.com/@${author}`,
      detected: true,
      message: `Detected Medium author: @${author}`,
    }
  }

  // Check Medium (custom subdomain)
  const mediumCustomMatch = url.match(patterns.mediumCustom)
  if (mediumCustomMatch) {
    const author = mediumCustomMatch[1]
    return {
      platform: 'medium',
      author,
      feedUrl: `https://medium.com/feed/@${author}`,
      profileUrl: `https://${author}.medium.com`,
      detected: true,
      message: `Detected Medium publication: ${author}`,
    }
  }

  // Check Twitter/X
  const twitterMatch = url.match(patterns.twitter)
  if (twitterMatch) {
    const author = twitterMatch[2]
    // Nitter provides RSS for Twitter
    return {
      platform: 'twitter',
      author,
      feedUrl: `https://nitter.net/${author}/rss`,
      profileUrl: `https://twitter.com/${author}`,
      detected: true,
      message: `Detected Twitter/X user: @${author} (using Nitter RSS)`,
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
      message: `Detected Dev.to author: ${author}`,
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
      message: `Detected Hashnode blog: ${author}`,
    }
  }

  // Check if URL is already an RSS feed
  if (url.includes('/feed') || url.includes('/rss') || url.endsWith('.xml')) {
    return {
      platform: 'rss',
      feedUrl: url,
      profileUrl: url.replace(/\/(feed|rss)(\.xml)?$/, ''),
      detected: true,
      message: 'Detected RSS feed URL',
    }
  }

  // Try to probe for RSS feed
  const probeResult = await probeForRss(url)
  if (probeResult.detected) {
    return probeResult
  }

  // Unknown - return the URL as-is
  return {
    platform: 'unknown',
    feedUrl: url,
    profileUrl: url,
    detected: false,
    message: 'Could not auto-detect platform. Please provide the RSS feed URL directly.',
  }
}

async function probeForRss(url: string): Promise<DetectionResult> {
  // Common RSS feed locations to probe
  const feedPaths = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/feed/']

  try {
    const baseUrl = new URL(url)
    const baseUrlStr = `${baseUrl.protocol}//${baseUrl.host}`

    // Skip probing in test environment or if URL is clearly invalid
    if (process.env.NODE_ENV === 'test' || baseUrl.hostname === 'localhost') {
      return {
        platform: 'unknown',
        feedUrl: url,
        profileUrl: baseUrlStr,
        detected: false,
        message: 'Skipped RSS probe in test environment',
      }
    }

    for (const path of feedPaths) {
      try {
        const feedUrl = baseUrlStr + path
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

        const response = await fetch(feedUrl, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'EmberFeed/1.0 Feed Detector',
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const contentType = response.headers.get('content-type') || ''
          if (
            contentType.includes('xml') ||
            contentType.includes('rss') ||
            contentType.includes('atom')
          ) {
            return {
              platform: 'rss',
              feedUrl,
              profileUrl: baseUrlStr,
              detected: true,
              message: `Found RSS feed at ${path}`,
            }
          }
        }
      } catch {
        // Continue to next path (timeout, network error, etc.)
      }
    }
  } catch {
    // URL parsing failed
  }

  return {
    platform: 'unknown',
    feedUrl: url,
    profileUrl: url,
    detected: false,
    message: 'No RSS feed detected',
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
