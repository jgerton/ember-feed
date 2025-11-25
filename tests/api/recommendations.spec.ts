import { test, expect } from '@playwright/test'
import { apiGet, assertResponseShape, assertArrayShape } from './test-utils'

test.describe('Recommendations API', () => {
  test('GET /recommendations returns recommendations', async ({ request }) => {
    const { data, ok, status } = await apiGet(request, '/recommendations')

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data).toBeTruthy()

    // Verify response structure (recommendations + pagination or message for empty)
    assertResponseShape(data, ['recommendations'])
    expect(Array.isArray(data.recommendations)).toBe(true)
    if (data.pagination) {
      expect(typeof data.pagination.count).toBe('number')
    }
  })

  test('returns default limit of 10 recommendations', async ({ request }) => {
    const { data } = await apiGet(request, '/recommendations')

    if (data.recommendations.length > 0) {
      expect(data.recommendations.length).toBeLessThanOrEqual(10)
      expect(data.pagination.count).toBe(data.recommendations.length)
    }
  })

  test('respects custom limit parameter', async ({ request }) => {
    const { data } = await apiGet(request, '/recommendations', { limit: '5' })

    if (data.recommendations.length > 0) {
      expect(data.recommendations.length).toBeLessThanOrEqual(5)
    }
  })

  test('enforces maximum limit of 50', async ({ request }) => {
    const { data } = await apiGet(request, '/recommendations', { limit: '100' })

    // Should cap at 50 even if requesting 100
    expect(data.recommendations.length).toBeLessThanOrEqual(50)
  })

  test('recommendation contains article with metadata', async ({ request }) => {
    const { data } = await apiGet(request, '/recommendations')

    if (data.recommendations.length > 0) {
      const rec = data.recommendations[0]

      // Verify article properties
      assertResponseShape(rec, [
        'id',
        'title',
        'description',
        'url',
        'source',
        'score',
        'publishedAt',
        'createdAt',
        'topics',
        'recommendation'
      ])

      // Verify data types
      expect(typeof rec.title).toBe('string')
      expect(typeof rec.url).toBe('string')
      expect(typeof rec.source).toBe('string')
      expect(typeof rec.score).toBe('number')
      expect(Array.isArray(rec.topics)).toBe(true)
    }
  })

  test('recommendation metadata is valid', async ({ request }) => {
    const { data } = await apiGet(request, '/recommendations')

    if (data.recommendations.length > 0) {
      const rec = data.recommendations[0]

      // Verify recommendation metadata structure
      assertResponseShape(rec.recommendation, [
        'score',
        'reason',
        'breakdown'
      ])

      // Score should be between 0-100
      expect(rec.recommendation.score).toBeGreaterThanOrEqual(0)
      expect(rec.recommendation.score).toBeLessThanOrEqual(100)

      // Reason should be a non-empty string
      expect(typeof rec.recommendation.reason).toBe('string')
      expect(rec.recommendation.reason.length).toBeGreaterThan(0)

      // Verify breakdown structure
      assertResponseShape(rec.recommendation.breakdown, [
        'similarityScore',
        'topicAffinityScore',
        'sourceAffinityScore',
        'serendipityBonus',
        'recencyBonus'
      ])

      // All breakdown scores should be numbers
      const breakdown = rec.recommendation.breakdown
      expect(typeof breakdown.similarityScore).toBe('number')
      expect(typeof breakdown.topicAffinityScore).toBe('number')
      expect(typeof breakdown.sourceAffinityScore).toBe('number')
      expect(typeof breakdown.serendipityBonus).toBe('number')
      expect(typeof breakdown.recencyBonus).toBe('number')
    }
  })

  test('recommendations are sorted by score descending', async ({ request }) => {
    const { data } = await apiGet(request, '/recommendations', { limit: '20' })

    if (data.recommendations.length > 1) {
      // Verify scores are in descending order
      for (let i = 0; i < data.recommendations.length - 1; i++) {
        const current = data.recommendations[i].recommendation.score
        const next = data.recommendations[i + 1].recommendation.score

        expect(current).toBeGreaterThanOrEqual(next)
      }
    }
  })

  test('recommendations have valid reason strings', async ({ request }) => {
    const { data } = await apiGet(request, '/recommendations')

    if (data.recommendations.length > 0) {
      const validReasons = [
        'Similar to articles you upvoted',
        'Based on your interest in',
        'Discover new sources',
        'Recommended for you'
      ]

      data.recommendations.forEach((rec: any) => {
        const reason = rec.recommendation.reason

        // Reason should match one of the valid patterns
        const matchesPattern = validReasons.some(pattern =>
          reason.includes(pattern) || reason.startsWith(pattern)
        )

        expect(matchesPattern).toBe(true)
      })
    }
  })

  test('breakdown scores sum correctly', async ({ request }) => {
    const { data } = await apiGet(request, '/recommendations')

    if (data.recommendations.length > 0) {
      data.recommendations.forEach((rec: any) => {
        const breakdown = rec.recommendation.breakdown
        const sum =
          breakdown.similarityScore +
          breakdown.topicAffinityScore +
          breakdown.sourceAffinityScore +
          breakdown.serendipityBonus +
          breakdown.recencyBonus

        // Total score should be capped at 100, sum might be higher
        const cappedSum = Math.min(100, sum)

        // Allow small floating point differences
        expect(Math.abs(rec.recommendation.score - cappedSum)).toBeLessThan(0.01)
      })
    }
  })

  test('returns helpful message for new users', async ({ request }) => {
    const { data } = await apiGet(request, '/recommendations')

    // If no recommendations available
    if (data.recommendations.length === 0) {
      expect(data.message).toBeTruthy()
      expect(data.message).toContain('reading articles')
    }
  })

  test('recommendations include topic information', async ({ request }) => {
    const { data } = await apiGet(request, '/recommendations')

    if (data.recommendations.length > 0) {
      const rec = data.recommendations[0]

      expect(Array.isArray(rec.topics)).toBe(true)

      if (rec.topics.length > 0) {
        const topic = rec.topics[0]
        assertResponseShape(topic, [
          'id',
          'articleId',
          'topicId',
          'relevance',
          'topic'
        ])

        // Verify nested topic object
        assertResponseShape(topic.topic, ['name', 'slug'])
        expect(typeof topic.topic.name).toBe('string')
        expect(typeof topic.topic.slug).toBe('string')
      }
    }
  })

  test('handles invalid limit parameter gracefully', async ({ request }) => {
    const { data, ok } = await apiGet(request, '/recommendations', { limit: 'invalid' })

    // Should still succeed, using default or 0
    expect(ok).toBe(true)
    expect(data).toBeTruthy()
  })

  test('handles negative limit parameter', async ({ request }) => {
    const { data, ok } = await apiGet(request, '/recommendations', { limit: '-5' })

    // Should still succeed
    expect(ok).toBe(true)
    expect(data).toBeTruthy()
  })

  test('recommendations exclude already-read articles', async ({ request }) => {
    // This is a behavioral test - recommendations should not include
    // articles that appear in user activity
    const { data: recs } = await apiGet(request, '/recommendations', { limit: '50' })

    // Get user activities to compare
    const { data: activities } = await apiGet(request, '/api/analytics')

    if (recs.recommendations.length > 0 && activities?.recentActivity) {
      const activityArticleIds = new Set(
        activities.recentActivity.map((a: any) => a.articleId)
      )

      // No recommended article should be in activity list
      recs.recommendations.forEach((rec: any) => {
        expect(activityArticleIds.has(rec.id)).toBe(false)
      })
    }
  })
})
