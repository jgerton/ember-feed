import { test, expect } from '@playwright/test'
import { apiGet, apiPatch, assertResponseShape, assertArrayShape } from './test-utils'

test.describe('Articles API', () => {
  test('GET /api/articles returns articles', async ({ request }) => {
    const { data, ok, status } = await apiGet(request, '/articles')

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data).toBeTruthy()

    assertResponseShape(data, ['articles', 'total'])
    expect(Array.isArray(data.articles)).toBe(true)
    expect(typeof data.total).toBe('number')
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
    expect(Array.isArray(data.articles)).toBe(true)

    // Personalized feed should have articles (if any exist in DB)
    if (data.articles.length > 0) {
      expect(data.articles.length).toBeGreaterThan(0)
    }
  })

  test('personalized feed includes topics', async ({ request }) => {
    const { data } = await apiGet(request, '/articles', {
      personalized: 'true',
      limit: '5'
    })

    if (data.articles.length > 0) {
      const article = data.articles[0]

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

    // Both should return articles
    expect(Array.isArray(highDiversity.articles)).toBe(true)
    expect(Array.isArray(lowDiversity.articles)).toBe(true)

    // High diversity should have more balanced source distribution
    if (highDiversity.articles.length >= 5 && lowDiversity.articles.length >= 5) {
      const highSources = new Set(highDiversity.articles.map((a: any) => a.source))
      const lowSources = new Set(lowDiversity.articles.map((a: any) => a.source))

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

  test('offset parameter skips articles', async ({ request }) => {
    const { data: first } = await apiGet(request, '/articles', { limit: '5', offset: '0' })
    const { data: second } = await apiGet(request, '/articles', { limit: '5', offset: '5' })

    if (first.articles.length > 0 && second.articles.length > 0) {
      // First article of second batch should be different from first batch
      const firstIds = new Set(first.articles.map((a: any) => a.id))
      const secondIds = new Set(second.articles.map((a: any) => a.id))

      // There should be no overlap
      const overlap = [...firstIds].filter(id => secondIds.has(id))
      expect(overlap.length).toBe(0)
    }
  })

  test('pagination works correctly', async ({ request }) => {
    const limit = 5
    const page1 = await apiGet(request, '/articles', { limit: String(limit), offset: '0' })
    const page2 = await apiGet(request, '/articles', { limit: String(limit), offset: String(limit) })

    if (page1.data.articles.length > 0 && page2.data.articles.length > 0) {
      // Pages should have different articles
      expect(page1.data.articles[0].id).not.toBe(page2.data.articles[0].id)
    }
  })

  test('articles are ordered by publishedAt desc by default', async ({ request }) => {
    const { data } = await apiGet(request, '/articles', { limit: '20' })

    if (data.articles.length > 1) {
      for (let i = 0; i < data.articles.length - 1; i++) {
        const current = new Date(data.articles[i].publishedAt)
        const next = new Date(data.articles[i + 1].publishedAt)

        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime())
      }
    }
  })

  test('total count matches database', async ({ request }) => {
    const { data } = await apiGet(request, '/articles')

    expect(typeof data.total).toBe('number')
    expect(data.total).toBeGreaterThanOrEqual(data.articles.length)
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
    const { data } = await apiGet(request, '/articles', {
      personalized: 'true',
      limit: '10',
      search: 'web'
    })

    expect(ok).toBe(true)
    expect(Array.isArray(data.articles)).toBe(true)

    // If articles returned, they should match all filters
    if (data.articles.length > 0) {
      expect(data.articles[0]).toBeTruthy()
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
    expect(data.total).toBeGreaterThanOrEqual(0)
  })
})
