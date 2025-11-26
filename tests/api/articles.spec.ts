import { test, expect } from '@playwright/test'

test.describe('Articles API', () => {
  test('GET /api/articles returns valid response', async ({ request }) => {
    const response = await request.get('/api/articles')

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    // Should have articles array
    expect(data).toHaveProperty('articles')
    expect(Array.isArray(data.articles)).toBeTruthy()
  })

  test('respects limit parameter', async ({ request }) => {
    const response = await request.get('/api/articles?limit=5')

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    // Should not exceed limit
    expect(data.articles.length).toBeLessThanOrEqual(5)
  })

  test('supports personalized mode', async ({ request }) => {
    const response = await request.get('/api/articles?personalized=true')

    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('articles')
  })

  test('supports topic filtering', async ({ request }) => {
    // First get available topics
    const topicsResponse = await request.get('/api/topics')
    if (!topicsResponse.ok()) {
      test.skip()
      return
    }

    const topics = await topicsResponse.json()

    if (topics.length > 0) {
      const response = await request.get(`/api/articles?topic=${topics[0].slug}`)
      expect(response.ok()).toBeTruthy()
    }
  })

  test('articles include required fields', async ({ request }) => {
    const response = await request.get('/api/articles?limit=1')

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    if (data.articles.length > 0) {
      const article = data.articles[0]

      expect(article).toHaveProperty('id')
      expect(article).toHaveProperty('title')
      expect(article).toHaveProperty('url')
      expect(article).toHaveProperty('source')
      expect(article).toHaveProperty('publishedAt')
    }
  })
})

test.describe('Article Activity API', () => {
  test('POST /api/articles/:id/activity tracks activity', async ({ request }) => {
    // First get an article
    const articlesResponse = await request.get('/api/articles?limit=1')
    const articles = await articlesResponse.json()

    if (articles.articles.length === 0) {
      test.skip()
      return
    }

    const articleId = articles.articles[0].id

    // Track a view
    const response = await request.post(`/api/articles/${articleId}/activity`, {
      data: { action: 'view' }
    })

    expect(response.ok()).toBeTruthy()
  })
})
