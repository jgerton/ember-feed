/**
 * API Tests: /api/feeds/validate
 * Tests the feed validation endpoint that checks RSS feed URLs without adding them to database
 */

import { test, expect } from '@playwright/test'
import { apiPost } from './test-utils'

test.describe('/api/feeds/validate', () => {
  test('validates a valid RSS feed URL', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/feeds/validate', {
      url: 'https://hnrss.org/frontpage'
    })

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.feedName).toBeDefined()
    expect(typeof data.feedName).toBe('string')
    expect(data.articlesCount).toBeDefined()
    expect(typeof data.articlesCount).toBe('number')
    expect(data.articlesCount).toBeGreaterThan(0)
    expect(data.message).toBe('Feed is valid and ready to add')
  })

  test('rejects request with missing URL', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/feeds/validate', {})

    expect(ok).toBe(false)
    expect(status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('URL is required')
    expect(data.suggestion).toBe('Please provide a feed URL to validate')
  })

  test('rejects invalid URL format', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/feeds/validate', {
      url: 'not-a-valid-url'
    })

    expect(ok).toBe(false)
    expect(status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid URL format')
    expect(data.suggestion).toBe('Please enter a valid http:// or https:// URL')
  })

  test('rejects non-HTTP/HTTPS protocols', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/feeds/validate', {
      url: 'ftp://example.com/feed.xml'
    })

    expect(ok).toBe(false)
    expect(status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid URL protocol')
    expect(data.suggestion).toBe('Please use http:// or https:// URLs')
  })

  test('handles unreachable feed URL', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/feeds/validate', {
      url: 'https://this-domain-does-not-exist-12345.com/feed.xml'
    })

    expect(ok).toBe(false)
    expect(status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
    expect(typeof data.error).toBe('string')
    expect(data.suggestion).toBeDefined()
    expect(typeof data.suggestion).toBe('string')
  })

  test('handles non-RSS content', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/feeds/validate', {
      url: 'https://example.com'
    })

    expect(ok).toBe(false)
    expect(status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
    // Should mention parsing or invalid feed content (including XML errors like "unexpected close tag")
    expect(typeof data.error).toBe('string')
    expect(data.error.length).toBeGreaterThan(0)
  })

  test('handles both http and https protocols', async ({ request }) => {
    // Test that http:// URLs are automatically upgraded to https:// or handled correctly
    const { ok, status } = await apiPost(request, '/feeds/validate', {
      url: 'http://hnrss.org/frontpage'
    })

    // Should either succeed or provide a helpful error
    expect(status).toBeGreaterThanOrEqual(200)
    expect(status).toBeLessThan(500)
    expect(ok).toBeDefined()
  })

  test('returns detailed error on server failure', async ({ request }) => {
    const { data, ok, status } = await apiPost(request, '/feeds/validate', {
      url: null as any // Force a server error
    })

    expect(ok).toBe(false)
    expect(status).toBeGreaterThanOrEqual(400)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
  })
})
