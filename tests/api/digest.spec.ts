import { test, expect } from '@playwright/test'
import { apiGet, assertResponseShape, assertArrayShape } from './test-utils'

test.describe('Daily Digest API', () => {
  test('GET /api/digest returns digest data', async ({ request }) => {
    const { data, ok, status } = await apiGet(request, '/digest')

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data).toBeTruthy()

    // Verify response structure
    assertResponseShape(data, [
      'date',
      'topArticles',
      'unreadTodos',
      'logs',
      'trendingTopics',
      'stats'
    ])
  })

  test('digest contains valid date string', async ({ request }) => {
    const { data } = await apiGet(request, '/digest')

    expect(data.date).toBeTruthy()
    const date = new Date(data.date)
    expect(date.toString()).not.toBe('Invalid Date')

    // Date should be within last minute (recent)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    expect(diff).toBeLessThan(60000) // Less than 1 minute old
  })

  test('topArticles contains valid article data', async ({ request }) => {
    const { data } = await apiGet(request, '/digest')

    expect(Array.isArray(data.topArticles)).toBe(true)

    // Should return up to 5 articles
    expect(data.topArticles.length).toBeLessThanOrEqual(5)

    if (data.topArticles.length > 0) {
      // Verify first article structure
      const article = data.topArticles[0]
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

      // Verify data types
      expect(typeof article.title).toBe('string')
      expect(typeof article.url).toBe('string')
      expect(typeof article.source).toBe('string')
      expect(typeof article.score).toBe('number')
    }
  })

  test('topArticles are from last 24 hours', async ({ request }) => {
    const { data } = await apiGet(request, '/digest')

    if (data.topArticles.length > 0) {
      const yesterday = new Date()
      yesterday.setHours(yesterday.getHours() - 24)

      data.topArticles.forEach((article: any) => {
        const publishedDate = new Date(article.publishedAt)
        expect(publishedDate.getTime()).toBeGreaterThanOrEqual(yesterday.getTime())
      })
    }
  })

  test('unreadTodos contains valid todo data', async ({ request }) => {
    const { data } = await apiGet(request, '/digest')

    expect(Array.isArray(data.unreadTodos)).toBe(true)

    if (data.unreadTodos.length > 0) {
      const todo = data.unreadTodos[0]
      assertResponseShape(todo, [
        'id',
        'text',
        'completed',
        'createdAt'
      ])

      // All todos should be uncompleted
      expect(todo.completed).toBe(false)
    }
  })

  test('logs are grouped by type', async ({ request }) => {
    const { data } = await apiGet(request, '/digest')

    assertResponseShape(data.logs, [
      'discoveries',
      'accomplishments',
      'blockers',
      'thoughts'
    ])

    // Each category should be an array
    expect(Array.isArray(data.logs.discoveries)).toBe(true)
    expect(Array.isArray(data.logs.accomplishments)).toBe(true)
    expect(Array.isArray(data.logs.blockers)).toBe(true)
    expect(Array.isArray(data.logs.thoughts)).toBe(true)

    // Verify log entry structure if any exist
    const allLogs = [
      ...data.logs.discoveries,
      ...data.logs.accomplishments,
      ...data.logs.blockers,
      ...data.logs.thoughts
    ]

    if (allLogs.length > 0) {
      const log = allLogs[0]
      assertResponseShape(log, [
        'id',
        'type',
        'content',
        'createdAt'
      ])
    }
  })

  test('trendingTopics contains valid topic data', async ({ request }) => {
    const { data } = await apiGet(request, '/digest')

    expect(Array.isArray(data.trendingTopics)).toBe(true)

    if (data.trendingTopics.length > 0) {
      const topic = data.trendingTopics[0]
      assertResponseShape(topic, ['slug', 'name', 'count'])

      expect(typeof topic.slug).toBe('string')
      expect(typeof topic.name).toBe('string')
      expect(typeof topic.count).toBe('number')
      expect(topic.count).toBeGreaterThan(0)
    }
  })

  test('stats contains valid metrics', async ({ request }) => {
    const { data } = await apiGet(request, '/digest')

    assertResponseShape(data.stats, [
      'newArticles',
      'unreadTodoCount',
      'logEntryCount'
    ])

    // All stats should be non-negative numbers
    expect(typeof data.stats.newArticles).toBe('number')
    expect(typeof data.stats.unreadTodoCount).toBe('number')
    expect(typeof data.stats.logEntryCount).toBe('number')

    expect(data.stats.newArticles).toBeGreaterThanOrEqual(0)
    expect(data.stats.unreadTodoCount).toBeGreaterThanOrEqual(0)
    expect(data.stats.logEntryCount).toBeGreaterThanOrEqual(0)
  })

  test('stats match actual data counts', async ({ request }) => {
    const { data } = await apiGet(request, '/digest')

    // Verify stats match actual arrays
    expect(data.stats.unreadTodoCount).toBe(data.unreadTodos.length)

    const totalLogs =
      data.logs.discoveries.length +
      data.logs.accomplishments.length +
      data.logs.blockers.length +
      data.logs.thoughts.length

    expect(data.stats.logEntryCount).toBe(totalLogs)
  })

  test('digest handles empty database gracefully', async ({ request }) => {
    // This test documents behavior when there's no data
    // Even with no data, API should return valid structure
    const { data, ok } = await apiGet(request, '/digest')

    expect(ok).toBe(true)
    expect(data).toBeTruthy()

    // Arrays can be empty but should exist
    expect(Array.isArray(data.topArticles)).toBe(true)
    expect(Array.isArray(data.unreadTodos)).toBe(true)
    expect(Array.isArray(data.trendingTopics)).toBe(true)
  })
})
