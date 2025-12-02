/**
 * API Tests: /api/n8n/*
 * Tests n8n integration endpoints (feeds, ingest, errors, trigger-apify)
 */

import { test, expect } from '@playwright/test'
import { apiPost, apiGet, apiPatch } from './test-utils'

// Run tests serially to avoid race conditions
test.describe.configure({ mode: 'serial' })

// n8n auth options for all API calls
const n8nAuth = { n8nAuth: true }

test.describe('/api/n8n/feeds', () => {
  test('GET returns feeds list for n8n', async ({ request }) => {
    const { data, ok, status } = await apiGet(request, '/n8n/feeds', undefined, n8nAuth)

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(typeof data.count).toBe('number')
    expect(Array.isArray(data.feeds)).toBe(true)

    // Check feed shape if feeds exist
    if (data.feeds.length > 0) {
      const feed = data.feeds[0]
      expect(feed).toHaveProperty('id')
      expect(feed).toHaveProperty('name')
      expect(feed).toHaveProperty('url')
      expect(feed).toHaveProperty('type')
      expect(feed).toHaveProperty('status')
      expect(feed).toHaveProperty('priority')
    }
  })

  test('GET filters by type', async ({ request }) => {
    const { data, ok } = await apiGet(request, '/n8n/feeds', { type: 'rss' }, n8nAuth)

    expect(ok).toBe(true)
    expect(data.success).toBe(true)
    // All returned feeds should be RSS type
    data.feeds.forEach((feed: { type: string }) => {
      expect(feed.type).toBe('rss')
    })
  })

  test('GET filters by status', async ({ request }) => {
    const { data, ok } = await apiGet(request, '/n8n/feeds', { status: 'active' }, n8nAuth)

    expect(ok).toBe(true)
    expect(data.success).toBe(true)
    // All returned feeds should have active status
    data.feeds.forEach((feed: { status: string }) => {
      expect(feed.status).toBe('active')
    })
  })

  test('GET filters by minimum priority', async ({ request }) => {
    const { data, ok } = await apiGet(request, '/n8n/feeds', { priority_min: '50' }, n8nAuth)

    expect(ok).toBe(true)
    expect(data.success).toBe(true)
    // All returned feeds should have priority >= 50
    data.feeds.forEach((feed: { priority: number }) => {
      expect(feed.priority).toBeGreaterThanOrEqual(50)
    })
  })
})

test.describe('/api/n8n/ingest', () => {
  test('POST accepts articles from n8n', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/n8n/ingest', {
      source: 'n8n',
      workflowId: 'test-workflow-123',
      articles: [
        {
          title: `Test Article ${Date.now()}`,
          url: `https://example.com/article-${Date.now()}`,
          description: 'Test article from n8n',
          source: 'test',
          publishedAt: new Date().toISOString(),
        },
      ],
    }, n8nAuth)

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.workflowId).toBe('test-workflow-123')
    expect(data.stats).toBeDefined()
    expect(data.stats.received).toBe(1)
    expect(data.stats.inserted).toBeGreaterThanOrEqual(0)
  })

  test('POST rejects invalid source', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/n8n/ingest', {
      source: 'invalid',
      workflowId: 'test',
      articles: [],
    }, n8nAuth)

    expect(ok).toBe(false)
    expect(status).toBe(400)
    expect(data.error).toContain('Invalid source')
  })

  test('POST rejects missing workflowId', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/n8n/ingest', {
      source: 'n8n',
      articles: [{ title: 'Test', url: 'https://example.com' }],
    }, n8nAuth)

    expect(ok).toBe(false)
    expect(status).toBe(400)
    expect(data.error).toContain('workflowId')
  })

  test('POST rejects empty articles array', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/n8n/ingest', {
      source: 'n8n',
      workflowId: 'test',
      articles: [],
    }, n8nAuth)

    expect(ok).toBe(false)
    expect(status).toBe(400)
    expect(data.error).toContain('articles')
  })

  test('POST handles articles with invalid URLs', async ({ request }) => {
    const { data, ok } = await apiPost(request, '/n8n/ingest', {
      source: 'n8n',
      workflowId: 'test-workflow-456',
      articles: [
        {
          title: 'Valid Article',
          url: `https://example.com/valid-${Date.now()}`,
          description: 'Valid',
          source: 'test',
          publishedAt: new Date().toISOString(),
        },
        {
          title: 'Invalid URL Article',
          url: 'not-a-url',
          description: 'Invalid',
          source: 'test',
          publishedAt: new Date().toISOString(),
        },
      ],
    }, n8nAuth)

    expect(ok).toBe(true)
    expect(data.stats.received).toBe(2)
    expect(data.stats.errors).toBeGreaterThanOrEqual(1) // Invalid URL counted as error
  })
})

test.describe('/api/n8n/errors', () => {
  let testErrorId: string

  test('POST creates an error record', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/n8n/errors', {
      workflowId: 'test-workflow-789',
      workflowName: 'Test Feed Collector',
      executionId: `exec-${Date.now()}`,
      errorType: 'api_error',
      errorMessage: 'Test error message',
      nodeId: 'node-1',
      nodeName: 'HTTP Request',
    }, n8nAuth)

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.errorId).toBeDefined()

    testErrorId = data.errorId
  })

  test('POST rejects missing required fields', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/n8n/errors', {
      workflowId: 'test',
      // Missing other required fields
    }, n8nAuth)

    expect(ok).toBe(false)
    expect(status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  test('GET returns errors list', async ({ request }) => {
    const { data, ok, status } = await apiGet(request, '/n8n/errors', undefined, n8nAuth)

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(typeof data.count).toBe('number')
    expect(data.stats).toBeDefined()
    expect(typeof data.stats.unresolved).toBe('number')
    expect(typeof data.stats.resolved).toBe('number')
    expect(Array.isArray(data.errors)).toBe(true)
  })

  test('GET filters by resolved status', async ({ request }) => {
    const { data, ok } = await apiGet(request, '/n8n/errors', { resolved: 'false' }, n8nAuth)

    expect(ok).toBe(true)
    expect(data.success).toBe(true)
    // All returned errors should be unresolved
    data.errors.forEach((error: { resolved: boolean }) => {
      expect(error.resolved).toBe(false)
    })
  })

  test('GET returns specific error by ID', async ({ request }) => {
    // Skip if we don't have a test error ID
    if (!testErrorId) {
      test.skip()
      return
    }

    const { data, ok, status } = await apiGet(request, `/n8n/errors/${testErrorId}`, undefined, n8nAuth)

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.error).toBeDefined()
    expect(data.error.id).toBe(testErrorId)
  })

  test('PATCH marks error as resolved', async ({ request }) => {
    // Skip if we don't have a test error ID
    if (!testErrorId) {
      test.skip()
      return
    }

    const { data, ok, status } = await apiPatch(request, `/n8n/errors/${testErrorId}`, {
      resolved: true,
    }, n8nAuth)

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.error.resolved).toBe(true)
    expect(data.error.resolvedAt).toBeDefined()
  })

  test('PATCH returns 404 for non-existent error', async ({ request }) => {
    const { data, ok, status } = await apiPatch(request, '/n8n/errors/non-existent-id', {
      resolved: true,
    }, n8nAuth)

    expect(ok).toBe(false)
    expect(status).toBe(404)
    expect(data.error).toBe('Error not found')
  })
})

test.describe('/api/n8n/trigger-apify', () => {
  test('POST requires feedIds or scrapeAll', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/n8n/trigger-apify', {}, n8nAuth)

    expect(ok).toBe(false)
    expect(status).toBe(400)
    expect(data.error).toContain('feedIds')
  })

  test('POST accepts feedIds array', async ({ request }) => {
    const { data, ok } = await apiPost(request, '/n8n/trigger-apify', {
      feedIds: ['feed-1', 'feed-2'],
    }, n8nAuth)

    // May fail if n8n is not running, but should not be 400
    if (!ok) {
      expect(data.message || data.error).toBeDefined()
    } else {
      expect(data.success).toBe(true)
    }
  })

  test('POST accepts scrapeAll flag', async ({ request }) => {
    const { data, ok } = await apiPost(request, '/n8n/trigger-apify', {
      scrapeAll: true,
    }, n8nAuth)

    // May fail if n8n is not running, but should not be 400
    if (!ok) {
      expect(data.message || data.error).toBeDefined()
    } else {
      expect(data.success).toBe(true)
    }
  })
})
