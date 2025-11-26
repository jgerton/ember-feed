import { test, expect } from '@playwright/test'

test.describe('Recommendations API', () => {
  test('GET /api/recommendations returns valid response', async ({ request }) => {
    const response = await request.get('/api/recommendations')

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    // Should have recommendations array
    expect(data).toHaveProperty('recommendations')
    expect(Array.isArray(data.recommendations)).toBeTruthy()

    // Should have pagination info
    expect(data).toHaveProperty('pagination')
  })

  test('respects limit parameter', async ({ request }) => {
    const response = await request.get('/api/recommendations?limit=5')

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    // Should not exceed limit
    expect(data.recommendations.length).toBeLessThanOrEqual(5)
    expect(data.pagination.limit).toBe(5)
  })

  test('recommendations include required fields', async ({ request }) => {
    const response = await request.get('/api/recommendations?limit=1')

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    if (data.recommendations.length > 0) {
      const rec = data.recommendations[0]

      // Check required article fields
      expect(rec).toHaveProperty('id')
      expect(rec).toHaveProperty('title')
      expect(rec).toHaveProperty('url')
      expect(rec).toHaveProperty('source')

      // Check recommendation metadata
      expect(rec).toHaveProperty('recommendation')
      expect(rec.recommendation).toHaveProperty('score')
      expect(rec.recommendation).toHaveProperty('reason')
      expect(rec.recommendation).toHaveProperty('breakdown')

      // Check breakdown fields
      const breakdown = rec.recommendation.breakdown
      expect(breakdown).toHaveProperty('similarityScore')
      expect(breakdown).toHaveProperty('topicAffinityScore')
      expect(breakdown).toHaveProperty('sourceAffinityScore')
      expect(breakdown).toHaveProperty('serendipityBonus')
      expect(breakdown).toHaveProperty('recencyBonus')
    }
  })

  test('handles pagination correctly', async ({ request }) => {
    const response = await request.get('/api/recommendations?limit=10&page=1')

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    expect(data.pagination).toHaveProperty('page')
    expect(data.pagination).toHaveProperty('offset')
    expect(data.pagination).toHaveProperty('limit')
    expect(data.pagination).toHaveProperty('hasMore')
    expect(data.pagination).toHaveProperty('total')
    expect(data.pagination).toHaveProperty('totalPages')
  })

  test('empty state returns helpful message', async ({ request }) => {
    const response = await request.get('/api/recommendations')

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    // Either has recommendations or has a helpful message
    if (data.recommendations.length === 0) {
      expect(data).toHaveProperty('message')
    }
  })
})
