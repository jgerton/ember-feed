/**
 * API Tests: /api/metadata
 * Tests metadata extraction and RSS feed discovery from article URLs
 */

import { test, expect } from '@playwright/test'
import { apiPost, assertResponseShape } from './test-utils'

test.describe('/metadata', () => {
  test('extracts metadata from a valid article URL', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/metadata', {
      url: 'https://news.ycombinator.com'
    })

    expect(ok).toBe(true)
    expect(status).toBe(200)

    // Validate response structure
    assertResponseShape(data, ['title', 'description', 'siteName', 'feeds'])

    // Validate types
    expect(typeof data.title).toBe('string')
    expect(typeof data.description).toBe('string')
    expect(typeof data.siteName).toBe('string')
    expect(Array.isArray(data.feeds)).toBe(true)

    // Optional fields
    if (data.author) expect(typeof data.author).toBe('string')
    if (data.image) expect(typeof data.image).toBe('string')
    if (data.publishedDate) expect(typeof data.publishedDate).toBe('string')
  })

  test('discovers RSS feeds from URL', async ({ request }) => {
    // HN RSS is a known RSS aggregator, should have feeds
    const { data, ok, status } = await apiPost(request, '/metadata', {
      url: 'https://hnrss.org'
    })

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data.feeds).toBeDefined()
    expect(Array.isArray(data.feeds)).toBe(true)

    // Should have at least some feed suggestions (either autodiscovered or common patterns)
    expect(data.feeds.length).toBeGreaterThan(0)

    // Validate feed structure
    if (data.feeds.length > 0) {
      const feed = data.feeds[0]
      expect(feed).toHaveProperty('url')
      expect(feed).toHaveProperty('title')
      expect(feed).toHaveProperty('type')
      expect(typeof feed.url).toBe('string')
      expect(typeof feed.title).toBe('string')
      expect(typeof feed.type).toBe('string')
    }
  })

  test('extracts siteName from URL when not in metadata', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/metadata', {
      url: 'https://example.com'
    })

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data.siteName).toBeDefined()
    expect(typeof data.siteName).toBe('string')
    // Should extract hostname without 'www.'
    expect(data.siteName).toBe('example.com')
  })

  test('rejects request with missing URL', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/metadata', {})

    expect(ok).toBe(false)
    expect(status).toBe(400)
    expect(data.error).toBe('URL is required')
  })

  test('rejects invalid URL format', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/metadata', {
      url: 'not-a-valid-url'
    })

    expect(ok).toBe(false)
    expect(status).toBe(400)
    expect(data.error).toBe('Invalid URL format')
  })

  test('handles unreachable URLs', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/metadata', {
      url: 'https://this-domain-definitely-does-not-exist-123456789.com'
    })

    expect(ok).toBe(false)
    expect(status).toBeGreaterThanOrEqual(400)
    expect(data.error).toBeDefined()
    expect(typeof data.error).toBe('string')
  })

  test('handles timeout for slow URLs', async ({ request }) => {
    // This test uses a URL that should timeout (10+ seconds)
    // Note: This test may take up to 10 seconds to complete
    const { data, ok, status } = await apiPost(request, '/metadata', {
      url: 'https://httpstat.us/200?sleep=15000'
    })

    expect(ok).toBe(false)
    expect(status).toBe(408) // Timeout status
    expect(data.error).toContain('timeout')
  })

  test('returns empty strings for missing metadata fields', async ({ request }) => {
    // Use a minimal page with no metadata
    const { data, ok, status } = await apiPost(request, '/metadata', {
      url: 'https://example.com'
    })

    expect(ok).toBe(true)
    expect(status).toBe(200)

    // title and description should be strings (may be empty)
    expect(typeof data.title).toBe('string')
    expect(typeof data.description).toBe('string')

    // Optional fields should be null if not present
    // (author, image, publishedDate are nullable)
  })

  test('discovers feeds via autodiscovery links', async ({ request }) => {
    // Test a URL that likely has RSS autodiscovery link tags
    const { data, ok, status } = await apiPost(request, '/metadata', {
      url: 'https://news.ycombinator.com'
    })

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(Array.isArray(data.feeds)).toBe(true)

    // HN should have RSS feeds
    expect(data.feeds.length).toBeGreaterThan(0)
  })

  test('suggests common feed patterns as fallback', async ({ request }) => {
    // Use a URL that likely doesn't have autodiscovery but might have feeds
    const { data, ok, status } = await apiPost(request, '/metadata', {
      url: 'https://example.com'
    })

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(Array.isArray(data.feeds)).toBe(true)

    // Should return common pattern suggestions
    expect(data.feeds.length).toBeGreaterThan(0)

    // Common patterns should include /feed, /rss, etc.
    const feedUrls = data.feeds.map((f: any) => f.url)
    const hasCommonPattern = feedUrls.some((url: string) =>
      url.includes('/feed') ||
      url.includes('/rss') ||
      url.includes('/atom.xml')
    )
    expect(hasCommonPattern).toBe(true)
  })

  test('handles URLs with redirects', async ({ request }) => {
    // Use a URL that redirects (most http:// -> https:// redirects)
    const { data, ok, status } = await apiPost(request, '/metadata', {
      url: 'http://example.com'
    })

    // Should follow redirect and succeed
    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data.siteName).toBeDefined()
  })
})
