/**
 * API Tests: /api/feeds
 * Tests RSS feed management endpoints (create, list, update, delete)
 *
 * Note: These tests hit real RSS feeds (hnrss.org) which may rate limit.
 * Tests are configured to run serially to avoid rate limiting.
 */

import { test, expect } from '@playwright/test'
import { apiPost, apiGet, apiPatch, apiDelete } from './test-utils'

// Run tests serially to avoid rate limiting from RSS feed providers
test.describe.configure({ mode: 'serial' })

test.describe('/feeds', () => {
  // Use different RSS providers to avoid rate limiting from any single source
  const testFeeds = [
    'https://dev.to/feed',
    'https://lobste.rs/rss',
    'https://news.ycombinator.com/rss',
  ]
  let feedIndex = 0

  // Helper to generate unique test URL using rotating providers
  const uniqueUrl = () => {
    const base = testFeeds[feedIndex % testFeeds.length]
    feedIndex++
    return `${base}?test=${Date.now()}_${Math.random().toString(36).slice(2)}`
  }

  // Helper to create a test feed
  const createTestFeed = async (request: any, name: string, url: string) => {
    return await apiPost(request, '/feeds', { name, url, priority: 50 })
  }

  test.describe('POST /api/feeds - Create feed', () => {
    test('creates a new RSS feed with valid data', async ({ request }) => {
      const feedName = `Test Feed ${Date.now()}`
      const feedUrl = uniqueUrl()

      const { data, ok, status } = await createTestFeed(request, feedName, feedUrl)

      expect(ok).toBe(true)
      expect(status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain(feedName)
      expect(data.message).toContain('added successfully')

      // Verify feed object
      expect(data.feed).toBeDefined()
      expect(data.feed.name).toBe(feedName)
      expect(data.feed.url).toBe(feedUrl)
      expect(data.feed.priority).toBe(50)
      expect(data.feed.status).toBe('active')
      expect(data.feed.consecutiveFailures).toBe(0)

      // Verify test result
      expect(data.testResult).toBeDefined()
      expect(data.testResult.articlesFound).toBeGreaterThanOrEqual(0)
    })

    test('rejects feed creation with missing name', async ({ request }) => {
      const { data, ok, status } = await apiPost(request, '/feeds', {
        url: 'https://example.com/feed'
      })

      expect(ok).toBe(false)
      expect(status).toBe(400)
      expect(data.error).toBe('Name and URL are required')
    })

    test('rejects feed creation with missing URL', async ({ request }) => {
      const { data, ok, status } = await apiPost(request, '/feeds', {
        name: 'Test Feed'
      })

      expect(ok).toBe(false)
      expect(status).toBe(400)
      expect(data.error).toBe('Name and URL are required')
    })

    test('rejects feed with invalid URL format', async ({ request }) => {
      const { data, ok, status } = await apiPost(request, '/feeds', {
        name: 'Test Feed',
        url: 'not-a-valid-url'
      })

      expect(ok).toBe(false)
      expect(status).toBe(400)
      expect(data.error).toBe('Invalid URL format')
    })

    test('rejects duplicate feed URL', async ({ request }) => {
      const feedName = `Test Feed ${Date.now()}`
      const feedUrl = uniqueUrl()

      // Create first feed
      const first = await createTestFeed(request, feedName, feedUrl)
      expect(first.ok).toBe(true)

      // Try to create duplicate
      const { data, ok, status } = await createTestFeed(request, `${feedName} Duplicate`, feedUrl)

      expect(ok).toBe(false)
      expect(status).toBe(409) // Conflict
      expect(data.error).toBe('Feed URL already exists')
    })

    test('clamps priority between 0 and 100', async ({ request }) => {
      const feedName = `Priority Test ${Date.now()}`

      // Test with priority > 100
      const { data: data1, ok: ok1 } = await apiPost(request, '/feeds', {
        name: feedName,
        url: uniqueUrl(),
        priority: 150
      })

      if (ok1) {
        expect(data1.feed.priority).toBeLessThanOrEqual(100)
      }

      // Test with priority < 0
      const { data: data2, ok: ok2 } = await apiPost(request, '/feeds', {
        name: `${feedName} 2`,
        url: uniqueUrl(),
        priority: -50
      })

      if (ok2) {
        expect(data2.feed.priority).toBeGreaterThanOrEqual(0)
      }
    })

    test('tests feed before creating', async ({ request }) => {
      const feedName = `Test Feed ${Date.now()}`
      const feedUrl = 'https://this-feed-does-not-exist-12345.com/feed'

      const { data, ok, status } = await createTestFeed(request, feedName, feedUrl)

      expect(ok).toBe(false)
      expect(status).toBe(400)
      expect(data.error).toBe('Feed test failed')
      expect(data.details).toBeDefined()
      expect(data.suggestion).toBe('Please verify the RSS feed URL is valid and accessible')
    })
  })

  test.describe('GET /api/feeds - List feeds', () => {
    test('lists all feeds', async ({ request }) => {
      const { data, ok, status } = await apiGet(request, '/feeds')

      expect(ok).toBe(true)
      expect(status).toBe(200)
      expect(Array.isArray(data)).toBe(true)

      if (data.length > 0) {
        const feed = data[0]
        expect(feed).toHaveProperty('id')
        expect(feed).toHaveProperty('name')
        expect(feed).toHaveProperty('url')
        expect(feed).toHaveProperty('priority')
        expect(feed).toHaveProperty('status')
      }
    })
  })

  test.describe('PATCH /api/feeds/[id] - Update feed', () => {
    test('updates feed properties', async ({ request }) => {
      // Create a test feed first with unique URL
      const { data: createData, ok: createOk } = await createTestFeed(request, `Update Test ${Date.now()}`, uniqueUrl())
      expect(createOk).toBe(true)

      const feedId = createData.feed.id

      // Update the feed (use 'quarantined' as it's a valid status)
      const { data, ok, status } = await apiPatch(request, `/feeds/${feedId}`, {
        priority: 75,
        status: 'quarantined'
      })

      expect(ok).toBe(true)
      expect(status).toBe(200)
      expect(data.feed.priority).toBe(75)
      expect(data.feed.status).toBe('quarantined')
    })

    test('updates feed category', async ({ request }) => {
      const { data: createData, ok: createOk } = await createTestFeed(request, `Category Test ${Date.now()}`, uniqueUrl())
      expect(createOk).toBe(true)

      const feedId = createData.feed.id

      const { data, ok, status } = await apiPatch(request, `/feeds/${feedId}`, {
        category: 'business'
      })

      expect(ok).toBe(true)
      expect(status).toBe(200)
      expect(data.feed.category).toBe('business')
    })

    test('updates feed type', async ({ request }) => {
      const { data: createData, ok: createOk } = await createTestFeed(request, `Type Test ${Date.now()}`, uniqueUrl())
      expect(createOk).toBe(true)

      const feedId = createData.feed.id

      const { data, ok, status } = await apiPatch(request, `/feeds/${feedId}`, {
        type: 'substack'
      })

      expect(ok).toBe(true)
      expect(status).toBe(200)
      expect(data.feed.type).toBe('substack')
    })

    test('toggles feed enabled status', async ({ request }) => {
      const { data: createData, ok: createOk } = await createTestFeed(request, `Enabled Test ${Date.now()}`, uniqueUrl())
      expect(createOk).toBe(true)

      const feedId = createData.feed.id

      // Disable the feed
      const { data: data1, ok: ok1 } = await apiPatch(request, `/feeds/${feedId}`, {
        enabled: false
      })

      expect(ok1).toBe(true)
      expect(data1.feed.enabled).toBe(false)

      // Re-enable the feed
      const { data: data2, ok: ok2 } = await apiPatch(request, `/feeds/${feedId}`, {
        enabled: true
      })

      expect(ok2).toBe(true)
      expect(data2.feed.enabled).toBe(true)
    })

    test('updates feed updateFrequency', async ({ request }) => {
      const { data: createData, ok: createOk } = await createTestFeed(request, `Frequency Test ${Date.now()}`, uniqueUrl())
      expect(createOk).toBe(true)

      const feedId = createData.feed.id

      const { data, ok, status } = await apiPatch(request, `/feeds/${feedId}`, {
        updateFrequency: 120
      })

      expect(ok).toBe(true)
      expect(status).toBe(200)
      expect(data.feed.updateFrequency).toBe(120)
    })

    test('rejects invalid category', async ({ request }) => {
      const { data: createData, ok: createOk } = await createTestFeed(request, `Invalid Category Test ${Date.now()}`, uniqueUrl())
      expect(createOk).toBe(true)

      const feedId = createData.feed.id

      const { data, ok, status } = await apiPatch(request, `/feeds/${feedId}`, {
        category: 'invalid-category'
      })

      expect(ok).toBe(false)
      expect(status).toBe(400)
      expect(data.error).toContain('category')
    })

    test('rejects invalid type', async ({ request }) => {
      const { data: createData, ok: createOk } = await createTestFeed(request, `Invalid Type Test ${Date.now()}`, uniqueUrl())
      expect(createOk).toBe(true)

      const feedId = createData.feed.id

      const { data, ok, status } = await apiPatch(request, `/feeds/${feedId}`, {
        type: 'invalid-type'
      })

      expect(ok).toBe(false)
      expect(status).toBe(400)
      expect(data.error).toContain('type')
    })

    test('clamps updateFrequency to valid range', async ({ request }) => {
      const { data: createData, ok: createOk } = await createTestFeed(request, `Frequency Clamp Test ${Date.now()}`, uniqueUrl())
      expect(createOk).toBe(true)

      const feedId = createData.feed.id

      // Test with value below minimum (15 minutes)
      const { data: data1, ok: ok1 } = await apiPatch(request, `/feeds/${feedId}`, {
        updateFrequency: 5
      })

      expect(ok1).toBe(true)
      expect(data1.feed.updateFrequency).toBeGreaterThanOrEqual(15)

      // Test with value above maximum (1440 minutes = 24 hours)
      const { data: data2, ok: ok2 } = await apiPatch(request, `/feeds/${feedId}`, {
        updateFrequency: 2000
      })

      expect(ok2).toBe(true)
      expect(data2.feed.updateFrequency).toBeLessThanOrEqual(1440)
    })

    test('updates multiple fields at once', async ({ request }) => {
      const { data: createData, ok: createOk } = await createTestFeed(request, `Multi Update Test ${Date.now()}`, uniqueUrl())
      expect(createOk).toBe(true)

      const feedId = createData.feed.id

      const { data, ok, status } = await apiPatch(request, `/feeds/${feedId}`, {
        category: 'science',
        type: 'medium',
        enabled: false,
        updateFrequency: 180,
        priority: 80
      })

      expect(ok).toBe(true)
      expect(status).toBe(200)
      expect(data.feed.category).toBe('science')
      expect(data.feed.type).toBe('medium')
      expect(data.feed.enabled).toBe(false)
      expect(data.feed.updateFrequency).toBe(180)
      expect(data.feed.priority).toBe(80)
    })
  })

  test.describe('DELETE /api/feeds/[id] - Delete feed', () => {
    test('deletes a feed', async ({ request }) => {
      const { data: createData, ok: createOk } = await createTestFeed(request, `Delete Test ${Date.now()}`, uniqueUrl())
      expect(createOk).toBe(true)

      const feedId = createData.feed.id

      const { ok, status } = await apiDelete(request, `/feeds/${feedId}`)

      expect(ok).toBe(true)
      expect(status).toBe(200)

      // Verify feed is deleted by trying to list feeds and not finding it
      const { data: feeds } = await apiGet(request, '/feeds')
      const found = feeds.find((f: { id: string }) => f.id === feedId)
      expect(found).toBeUndefined()
    })
  })

  test.describe('/api/feeds/check - Check subscription', () => {
    test('checks if feed URL is subscribed', async ({ request }) => {
      const feedUrl = 'https://hnrss.org/frontpage'

      const { data, ok, status } = await apiPost(request, '/feeds/check', {
        url: feedUrl
      })

      expect(ok).toBe(true)
      expect(status).toBe(200)
      expect(data).toHaveProperty('exists')
      expect(typeof data.exists).toBe('boolean')

      // If exists, should also have feed details
      if (data.exists) {
        expect(data.feed).toBeDefined()
        expect(data.feed).toHaveProperty('id')
        expect(data.feed).toHaveProperty('name')
        expect(data.feed).toHaveProperty('url')
      }
    })
  })

  test.describe('/api/feeds/health - Feed health status', () => {
    test('returns feed health status', async ({ request }) => {
      const { data, ok, status } = await apiGet(request, '/feeds/health')

      expect(ok).toBe(true)
      expect(status).toBe(200)
      // Validate response structure
      expect(data).toHaveProperty('total')
      expect(data).toHaveProperty('active')
      expect(data).toHaveProperty('failing')
      expect(data).toHaveProperty('quarantined')
    })
  })
})
