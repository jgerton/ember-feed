import { NextResponse } from 'next/server'
import metascraper from 'metascraper'
import metascraperAuthor from 'metascraper-author'
import metascraperDate from 'metascraper-date'
import metascraperDescription from 'metascraper-description'
import metascraperImage from 'metascraper-image'
import metascraperTitle from 'metascraper-title'
import metascraperUrl from 'metascraper-url'
import * as cheerio from 'cheerio'
import { testFeedUrl } from '@/lib/feedHealthService'

// Initialize metascraper with plugins
const scraper = metascraper([
  metascraperAuthor(),
  metascraperDate(),
  metascraperDescription(),
  metascraperImage(),
  metascraperTitle(),
  metascraperUrl()
])

// Common RSS feed URL patterns to try as fallback
const COMMON_FEED_PATTERNS = [
  '/feed',
  '/rss',
  '/atom.xml',
  '/feed.xml',
  '/rss.xml',
  '/blog/feed',
  '/index.xml'
]

// SSRF protection: block internal/private IPs and localhost
function isBlockedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    // Block localhost and common localhost aliases
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true
    }

    // Block private IP ranges
    // 10.0.0.0 - 10.255.255.255
    // 172.16.0.0 - 172.31.255.255
    // 192.168.0.0 - 192.168.255.255
    // 169.254.0.0 - 169.254.255.255 (link-local)
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
    const match = hostname.match(ipv4Pattern)
    if (match) {
      const [, a, b] = match.map(Number)
      if (a === 10) return true // 10.x.x.x
      if (a === 172 && b >= 16 && b <= 31) return true // 172.16-31.x.x
      if (a === 192 && b === 168) return true // 192.168.x.x
      if (a === 169 && b === 254) return true // 169.254.x.x
      if (a === 127) return true // 127.x.x.x
      if (a === 0) return true // 0.x.x.x
    }

    // Block internal hostnames
    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return true
    }

    // Block file:// and other non-http(s) protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return true
    }

    return false
  } catch {
    return true // Block malformed URLs
  }
}

interface ValidatedFeed {
  url: string
  title: string
  type: string
  validated: boolean
  feedTitle?: string
  articlesCount?: number
}

async function discoverRssFeeds(url: string, html: string): Promise<ValidatedFeed[]> {
  const $ = cheerio.load(html)
  const potentialFeeds: Array<{ url: string; title: string; type: string }> = []

  // 1. Check for RSS autodiscovery links
  $('link[rel="alternate"]').each((_, elem) => {
    const type = $(elem).attr('type')
    if (type?.includes('rss') || type?.includes('atom') || type?.includes('xml')) {
      const href = $(elem).attr('href')
      const title = $(elem).attr('title')
      if (href) {
        try {
          potentialFeeds.push({
            url: new URL(href, url).href, // Resolve relative URLs
            title: title || '',
            type: type
          })
        } catch (error) {
          console.error('Invalid feed URL:', href)
        }
      }
    }
  })

  // 2. If no feeds found via autodiscovery, try common patterns
  if (potentialFeeds.length === 0) {
    const domain = new URL(url).origin
    for (const pattern of COMMON_FEED_PATTERNS) {
      potentialFeeds.push({
        url: `${domain}${pattern}`,
        title: '',
        type: 'application/rss+xml'
      })
    }
  }

  // 3. Validate each potential feed by actually fetching and parsing it
  const validationResults = await Promise.all(
    potentialFeeds.map(async (feed) => {
      try {
        const result = await testFeedUrl(feed.url)
        if (result.success) {
          return {
            ...feed,
            validated: true,
            feedTitle: result.feedTitle || feed.title,
            articlesCount: result.articlesCount
          } as ValidatedFeed
        }
        return null
      } catch {
        return null
      }
    })
  )

  // Filter out invalid feeds and return only validated ones
  return validationResults.filter((feed): feed is ValidatedFeed => feed !== null)
}

// POST /api/metadata - Extract metadata and discover RSS feeds from a URL
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // SSRF protection: block internal/private URLs
    if (isBlockedUrl(url)) {
      return NextResponse.json(
        { error: 'URL not allowed: internal or private addresses are blocked' },
        { status: 403 }
      )
    }

    // Fetch the page with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EmberFeed/1.0; +https://ember-feed.com/bot)'
      }
    })
    clearTimeout(timeout)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: response.status }
      )
    }

    const html = await response.text()

    // Extract metadata
    const metadata = await scraper({ html, url })

    // Discover RSS feeds
    const feeds = await discoverRssFeeds(url, html)

    // Extract site name from URL if not in metadata
    const siteName = metadata.publisher || new URL(url).hostname.replace('www.', '')

    return NextResponse.json({
      title: metadata.title || '',
      description: metadata.description || '',
      author: metadata.author || null,
      image: metadata.image || null,
      publishedDate: metadata.date || null,
      siteName,
      feeds
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error extracting metadata:', error)

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout - URL took too long to load' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to extract metadata', details: message },
      { status: 500 }
    )
  }
}
