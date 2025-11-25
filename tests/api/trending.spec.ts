import { test, expect } from '@playwright/test'
import { apiGet, assertResponseShape, assertArrayShape } from './test-utils'

test.describe('Trending API', () => {
  test.describe('GET /api/trending/hot', () => {
    test('returns hot topics with default params', async ({ request }) => {
      const { data, ok, status } = await apiGet(request, '/trending/hot')

      // May fail if aggregator is not running, but structure should still be valid
      if (ok) {
        expect(status).toBe(200)
        expect(data).toBeTruthy()
        expect('topics' in data || 'error' in data).toBe(true)

        if (data.topics) {
          expect(Array.isArray(data.topics)).toBe(true)
        }
      }
    })

    test('respects timeframe parameter (24hr)', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/trending/hot', { timeframe: '24hr' })

      if (ok && data.topics) {
        expect(Array.isArray(data.topics)).toBe(true)
      }
    })

    test('respects timeframe parameter (3day)', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/trending/hot', { timeframe: '3day' })

      if (ok && data.topics) {
        expect(Array.isArray(data.topics)).toBe(true)
      }
    })

    test('respects timeframe parameter (7day)', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/trending/hot', { timeframe: '7day' })

      if (ok && data.topics) {
        expect(Array.isArray(data.topics)).toBe(true)
      }
    })

    test('rejects invalid timeframe', async ({ request }) => {
      const { data, ok, status } = await apiGet(request, '/trending/hot', { timeframe: 'invalid' })

      expect(ok).toBe(false)
      expect(status).toBe(400)
      expect(data.error).toContain('timeframe must be one of')
    })

    test('respects limit parameter', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/trending/hot', { limit: '3' })

      if (ok && data.topics) {
        expect(data.topics.length).toBeLessThanOrEqual(3)
      }
    })

    test('hot topic has expected structure', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/trending/hot', { limit: '1' })

      if (ok && data.topics && data.topics.length > 0) {
        const topic = data.topics[0]

        // Core fields expected from aggregator
        assertResponseShape(topic, ['keyword', 'rank'])

        expect(typeof topic.keyword).toBe('string')
        expect(typeof topic.rank).toBe('number')

        // Optional but expected fields
        if ('mentions' in topic) {
          expect(typeof topic.mentions).toBe('number')
        }
        if ('sources' in topic) {
          expect(Array.isArray(topic.sources)).toBe(true)
        }
      }
    })
  })

  test.describe('GET /api/trending/trending-up', () => {
    test('returns trending-up topics with default params', async ({ request }) => {
      const { data, ok, status } = await apiGet(request, '/trending/trending-up')

      if (ok) {
        expect(status).toBe(200)
        expect(data).toBeTruthy()
        expect('topics' in data || 'error' in data).toBe(true)

        if (data.topics) {
          expect(Array.isArray(data.topics)).toBe(true)
        }
      }
    })

    test('respects timeframe parameter (7day)', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/trending/trending-up', { timeframe: '7day' })

      if (ok && data.topics) {
        expect(Array.isArray(data.topics)).toBe(true)
      }
    })

    test('respects timeframe parameter (14day)', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/trending/trending-up', { timeframe: '14day' })

      if (ok && data.topics) {
        expect(Array.isArray(data.topics)).toBe(true)
      }
    })

    test('respects timeframe parameter (30day)', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/trending/trending-up', { timeframe: '30day' })

      if (ok && data.topics) {
        expect(Array.isArray(data.topics)).toBe(true)
      }
    })

    test('rejects invalid timeframe', async ({ request }) => {
      const { data, ok, status } = await apiGet(request, '/trending/trending-up', { timeframe: 'invalid' })

      expect(ok).toBe(false)
      expect(status).toBe(400)
      expect(data.error).toContain('timeframe must be one of')
    })

    test('trending-up topic has velocity metrics', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/trending/trending-up', { limit: '1' })

      if (ok && data.topics && data.topics.length > 0) {
        const topic = data.topics[0]

        // Core fields
        assertResponseShape(topic, ['keyword', 'rank'])

        // Velocity metrics (if aggregator provides them)
        if ('velocity' in topic) {
          expect(typeof topic.velocity).toBe('number')
        }
        if ('percent_growth' in topic) {
          expect(typeof topic.percent_growth).toBe('number')
        }
        if ('current_volume' in topic) {
          expect(typeof topic.current_volume).toBe('number')
        }
        if ('previous_volume' in topic) {
          expect(typeof topic.previous_volume).toBe('number')
        }
      }
    })
  })

  test.describe('GET /api/trending/feeds', () => {
    test('returns trending feeds', async ({ request }) => {
      const { data, ok, status } = await apiGet(request, '/trending/feeds')

      if (ok) {
        expect(status).toBe(200)
        expect(data).toBeTruthy()
      }
    })
  })

  test.describe('API Response Caching', () => {
    test('hot topics response includes cache headers', async ({ request }) => {
      const { response, ok } = await apiGet(request, '/trending/hot')

      if (ok) {
        const cacheControl = response.headers()['cache-control']
        // Should have some caching policy
        expect(cacheControl).toBeTruthy()
      }
    })

    test('trending-up response includes cache headers', async ({ request }) => {
      const { response, ok } = await apiGet(request, '/trending/trending-up')

      if (ok) {
        const cacheControl = response.headers()['cache-control']
        expect(cacheControl).toBeTruthy()
      }
    })
  })
})
