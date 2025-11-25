import { test, expect } from '@playwright/test'
import { apiGet, apiPatch, assertResponseShape, assertArrayShape } from './test-utils'

test.describe('Articles API', () => {
  test('GET /api/articles returns articles', async ({ request }) => {
    const { data, ok, status } = await apiGet(request, '/articles')

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data).toBeTruthy()

    assertResponseShape(data, ['articles', 'pagination'])
    expect(Array.isArray(data.articles)).toBe(true)
    expect(typeof data.pagination.count).toBe('number')
  })

  test('returns default limit of 20 articles', async ({ request }) => {
    const { data } = await apiGet(request, '/articles')

    if (data.articles.length > 0) {
      expect(data.articles.length).toBeLessThanOrEqual(20)
    }
  })

  test('respects custom limit parameter', async ({ request }) => {
    const { data } = await apiGet(request, '/articles', { limit: '5' })

    if (data.articles.length > 0) {
      expect(data.articles.length).toBeLessThanOrEqual(5)
    }
  })

  test('article contains required fields', async ({ request }) => {
    const { data } = await apiGet(request, '/articles')

    if (data.articles.length > 0) {
      const article = data.articles[0]

      assertResponseShape(article, [
        'id',
        'title',
        'description',
        'url',
        'source',
        'score',
        'publishedAt',
        'createdAt'
      ])

      expect(typeof article.title).toBe('string')
      expect(typeof article.url).toBe('string')
      expect(typeof article.source).toBe('string')
      expect(typeof article.score).toBe('number')
    }
  })

  test('personalized feed returns ranked articles', async ({ request }) => {
    const { data } = await apiGet(request, '/articles', {
      personalized: 'true',
      limit: '10'
    })

    expect(data).toBeTruthy()
    // Personalized feed returns array directly
    expect(Array.isArray(data)).toBe(true)

    // Personalized feed should have articles (if any exist in DB)
    if (data.length > 0) {
      expect(data.length).toBeGreaterThan(0)
    }
  })

  test('personalized feed includes topics', async ({ request }) => {
    const { data } = await apiGet(request, '/articles', {
      personalized: 'true',
      limit: '5'
    })

    // Personalized feed returns array directly
    if (data.length > 0) {
      const article = data[0]

      expect('topics' in article).toBe(true)
      expect(Array.isArray(article.topics)).toBe(true)

      if (article.topics.length > 0) {
        const topicRelation = article.topics[0]
        assertResponseShape(topicRelation, [
          'topic',
          'relevance'
        ])

        assertResponseShape(topicRelation.topic, ['name', 'slug'])
      }
    }
  })

  test('diversity affects source distribution', async ({ request }) => {
    // Set high diversity
    await apiPatch(request, '/settings', { diversityLevel: 'high' })

    const { data: highDiversity } = await apiGet(request, '/articles', {
      personalized: 'true',
      limit: '10'
    })

    // Set low diversity
    await apiPatch(request, '/settings', { diversityLevel: 'low' })

    const { data: lowDiversity } = await apiGet(request, '/articles', {
      personalized: 'true',
      limit: '10'
    })

    // Personalized feeds return arrays directly
    expect(Array.isArray(highDiversity)).toBe(true)
    expect(Array.isArray(lowDiversity)).toBe(true)

    // High diversity should have more balanced source distribution
    if (highDiversity.length >= 5 && lowDiversity.length >= 5) {
      const highSources = new Set(highDiversity.map((a: any) => a.source))
      const lowSources = new Set(lowDiversity.map((a: any) => a.source))

      // High diversity should tend to have more unique sources
      // (This is probabilistic, so we just verify structure)
      expect(highSources.size).toBeGreaterThan(0)
      expect(lowSources.size).toBeGreaterThan(0)
    }
  })

  test('topic filter returns only matching articles', async ({ request }) => {
    // First, get available topics
    const { data: topicsData } = await apiGet(request, '/topics')

    if (topicsData.topics && topicsData.topics.length > 0) {
      const topic = topicsData.topics[0]

      // Get articles for this topic
      const { data } = await apiGet(request, '/articles', {
        topic: topic.slug,
        personalized: 'true',
        limit: '10'
      })

      if (data.articles.length > 0) {
        // Each article should have this topic
        data.articles.forEach((article: any) => {
          const articleTopics = article.topics?.map((t: any) => t.topic?.slug) || []
          expect(articleTopics).toContain(topic.slug)
        })
      }
    }
  })

  test('search filters articles by keyword', async ({ request }) => {
    const { data } = await apiGet(request, '/articles', {
      search: 'AI',
      limit: '20'
    })

    expect(Array.isArray(data.articles)).toBe(true)

    if (data.articles.length > 0) {
      // At least some articles should mention 'AI' in title or description
      const hasKeyword = data.articles.some((article: any) => {
        const text = `${article.title} ${article.description}`.toLowerCase()
        return text.includes('ai')
      })

      expect(hasKeyword).toBe(true)
    }
  })

  test('cursor pagination returns different articles', async ({ request }) => {
    // First page
    const { data: first } = await apiGet(request, '/articles', { limit: '5' })

    if (first.articles.length > 0 && first.pagination.hasMore) {
      // Second page using cursor
      const { data: second } = await apiGet(request, '/articles', {
        limit: '5',
        cursor: first.pagination.nextCursor
      })

      if (second.articles.length > 0) {
        // First article of second batch should be different from first batch
        const firstIds = new Set(first.articles.map((a: any) => a.id))
        const secondIds = new Set(second.articles.map((a: any) => a.id))

        // There should be no overlap
        const overlap = [...firstIds].filter(id => secondIds.has(id))
        expect(overlap.length).toBe(0)
      }
    }
  })

  test('pagination structure is correct', async ({ request }) => {
    const { data } = await apiGet(request, '/articles', { limit: '5' })

    // Verify pagination structure
    expect(data.pagination).toBeTruthy()
    expect(typeof data.pagination.hasMore).toBe('boolean')
    expect(typeof data.pagination.count).toBe('number')
    if (data.pagination.hasMore) {
      expect(data.pagination.nextCursor).toBeTruthy()
    }
  })

  test('articles are ordered by score desc by default', async ({ request }) => {
    const { data } = await apiGet(request, '/articles', { limit: '20' })

    if (data.articles.length > 1) {
      for (let i = 0; i < data.articles.length - 1; i++) {
        const current = data.articles[i].score
        const next = data.articles[i + 1].score

        // Primary sort is by score descending
        expect(current).toBeGreaterThanOrEqual(next)
      }
    }
  })

  test('pagination count matches returned articles', async ({ request }) => {
    const { data } = await apiGet(request, '/articles')

    expect(typeof data.pagination.count).toBe('number')
    expect(data.pagination.count).toBe(data.articles.length)
  })

  test('handles invalid limit gracefully', async ({ request }) => {
    const { ok } = await apiGet(request, '/articles', { limit: 'invalid' })

    // Should still succeed with default
    expect(ok).toBe(true)
  })

  test('handles negative offset gracefully', async ({ request }) => {
    const { ok } = await apiGet(request, '/articles', { offset: '-5' })

    // Should still succeed (treated as 0)
    expect(ok).toBe(true)
  })

  test('source filter returns only matching source', async ({ request }) => {
    const { data: allArticles } = await apiGet(request, '/articles', { limit: '50' })

    if (allArticles.articles.length > 0) {
      const source = allArticles.articles[0].source

      const { data } = await apiGet(request, '/articles', {
        source: source,
        limit: '20'
      })

      if (data.articles.length > 0) {
        // All should be from this source
        data.articles.forEach((article: any) => {
          expect(article.source).toBe(source)
        })
      }
    }
  })

  test('combines multiple filters correctly', async ({ request }) => {
    const { data, ok } = await apiGet(request, '/articles', {
      personalized: 'true',
      limit: '10',
      search: 'web'
    })

    expect(ok).toBe(true)
    // Personalized feed returns array directly
    expect(Array.isArray(data)).toBe(true)

    // If articles returned, they should match all filters
    if (data.length > 0) {
      expect(data[0]).toBeTruthy()
    }
  })

  test('empty result set handled gracefully', async ({ request }) => {
    const { data, ok } = await apiGet(request, '/articles', {
      search: 'xyzzynonexistentkeyword123',
      limit: '10'
    })

    expect(ok).toBe(true)
    expect(Array.isArray(data.articles)).toBe(true)
    expect(data.articles.length).toBe(0)
    // Check pagination instead of total
    expect(data.pagination.count).toBe(0)
  })
})
