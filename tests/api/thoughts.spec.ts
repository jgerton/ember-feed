/**
 * API Tests: /api/thoughts
 * Tests thought capture and management endpoints
 */

import { test, expect } from '@playwright/test'
import { apiGet, apiPost, assertArrayShape } from './test-utils'

test.describe('/thoughts', () => {
  test.describe('POST /api/thoughts - Create thought', () => {
    test('creates a basic thought with text only', async ({ request }) => {
      const thoughtText = `Test thought ${Date.now()}`

      const { data, ok, status } = await apiPost(request, '/thoughts', {
        text: thoughtText
      })

      expect(ok).toBe(true)
      expect(status).toBe(201)
      expect(data.id).toBeDefined()
      expect(data.text).toBe(thoughtText)
      expect(data.category).toBeNull()
      expect(data.categoryFields).toBeNull()
      expect(data.articleId).toBeNull()
      expect(data.createdAt).toBeDefined()
      expect(data.updatedAt).toBeDefined()
    })

    test('creates thought with category', async ({ request }) => {
      const thoughtText = `Categorized thought ${Date.now()}`
      const category = 'Random'

      const { data, ok, status } = await apiPost(request, '/thoughts', {
        text: thoughtText,
        category
      })

      expect(ok).toBe(true)
      expect(status).toBe(201)
      expect(data.text).toBe(thoughtText)
      expect(data.category).toBe(category)
    })

    test('creates thought with universal URL metadata', async ({ request }) => {
      const thoughtText = `Thought with URL ${Date.now()}`
      const universalUrl = {
        url: 'https://example.com/article',
        metadata: {
          title: 'Example Article',
          author: 'John Doe',
          siteName: 'example.com',
          feeds: []
        }
      }

      const { data, ok, status } = await apiPost(request, '/thoughts', {
        text: thoughtText,
        category: 'Research',
        universalUrl
      })

      expect(ok).toBe(true)
      expect(status).toBe(201)
      expect(data.text).toBe(thoughtText)
      // Note: universalUrl is stored in categoryFields in current implementation
      // This test validates the data is accepted, actual storage structure may vary
    })

    test('creates thought with category-specific fields', async ({ request }) => {
      const thoughtText = `Video insight ${Date.now()}`
      const categoryFields = {
        url: 'https://youtube.com/watch?v=test',
        timestamp: '12:34',
        creator: 'Test Creator',
        keyQuote: 'Important quote here'
      }

      const { data, ok, status } = await apiPost(request, '/thoughts', {
        text: thoughtText,
        category: 'Video Insights',
        categoryFields
      })

      expect(ok).toBe(true)
      expect(status).toBe(201)
      expect(data.text).toBe(thoughtText)
      expect(data.category).toBe('Video Insights')
      expect(data.categoryFields).toEqual(categoryFields)
    })

    test('rejects thought with empty text', async ({ request }) => {
      const { data, ok, status } = await apiPost(request, '/thoughts', {
        text: ''
      })

      expect(ok).toBe(false)
      expect(status).toBe(400)
      expect(data.error).toBe('Thought text is required')
    })

    test('rejects thought with whitespace-only text', async ({ request }) => {
      const { data, ok, status } = await apiPost(request, '/thoughts', {
        text: '   '
      })

      expect(ok).toBe(false)
      expect(status).toBe(400)
      expect(data.error).toBe('Thought text is required')
    })

    test('rejects thought with missing text field', async ({ request }) => {
      const { data, ok, status } = await apiPost(request, '/thoughts', {
        category: 'Random'
      })

      expect(ok).toBe(false)
      expect(status).toBe(400)
      expect(data.error).toBe('Thought text is required')
    })

    test('trims whitespace from thought text', async ({ request }) => {
      const thoughtText = 'Test thought'
      const { data, ok, status } = await apiPost(request, '/thoughts', {
        text: `  ${thoughtText}  `
      })

      expect(ok).toBe(true)
      expect(status).toBe(201)
      expect(data.text).toBe(thoughtText) // Should be trimmed
    })

    test('trims whitespace from category', async ({ request }) => {
      const category = 'App Ideas'
      const { data, ok, status } = await apiPost(request, '/thoughts', {
        text: 'Test thought',
        category: `  ${category}  `
      })

      expect(ok).toBe(true)
      expect(status).toBe(201)
      expect(data.category).toBe(category) // Should be trimmed
    })

    test('allows null category', async ({ request }) => {
      const { data, ok, status } = await apiPost(request, '/thoughts', {
        text: 'Uncategorized thought',
        category: null
      })

      expect(ok).toBe(true)
      expect(status).toBe(201)
      expect(data.category).toBeNull()
    })
  })

  test.describe('GET /api/thoughts - List thoughts', () => {
    test('lists all thoughts in descending order', async ({ request }) => {
      // Create a test thought first
      await apiPost(request, '/thoughts', {
        text: `Test thought for listing ${Date.now()}`
      })

      const { data, ok, status } = await apiGet(request, '/thoughts')

      expect(ok).toBe(true)
      expect(status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)

      // Validate structure
      assertArrayShape(data, ['id', 'text', 'createdAt', 'updatedAt'])

      // Verify ordering (newest first)
      if (data.length > 1) {
        const first = new Date(data[0].createdAt).getTime()
        const second = new Date(data[1].createdAt).getTime()
        expect(first).toBeGreaterThanOrEqual(second)
      }
    })

    test('filters thoughts by category', async ({ request }) => {
      const category = 'Article Ideas'
      const thoughtText = `Article idea ${Date.now()}`

      // Create a thought with specific category
      await apiPost(request, '/thoughts', {
        text: thoughtText,
        category
      })

      // Filter by category
      const { data, ok, status } = await apiGet(request, '/thoughts', { category })

      expect(ok).toBe(true)
      expect(status).toBe(200)
      expect(Array.isArray(data)).toBe(true)

      // All results should have the specified category
      data.forEach((thought: any) => {
        expect(thought.category).toBe(category)
      })

      // Our created thought should be in the results
      const found = data.some((t: any) => t.text === thoughtText)
      expect(found).toBe(true)
    })

    test('returns empty array when no thoughts match category', async ({ request }) => {
      const nonExistentCategory = `NonExistent${Date.now()}`

      const { data, ok, status } = await apiGet(request, '/thoughts', {
        category: nonExistentCategory
      })

      expect(ok).toBe(true)
      expect(status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(0)
    })

    test('includes article relation when present', async ({ request }) => {
      const { data, ok, status } = await apiGet(request, '/thoughts')

      expect(ok).toBe(true)
      expect(status).toBe(200)

      // Find a thought with an article relation
      const thoughtWithArticle = data.find((t: any) => t.article !== null)

      if (thoughtWithArticle) {
        expect(thoughtWithArticle.article).toHaveProperty('id')
        expect(thoughtWithArticle.article).toHaveProperty('title')
        expect(thoughtWithArticle.article).toHaveProperty('url')
        expect(thoughtWithArticle.article).toHaveProperty('source')
      }
    })
  })

  test.describe('PATCH /api/thoughts/[id] - Update thought', () => {
    test.skip('updates thought text', async ({ request }) => {
      // Note: This test is skipped - implement when PATCH endpoint is confirmed
      // Create a thought first
      const { data: createData } = await apiPost(request, '/thoughts', {
        text: 'Original text'
      })

      const thoughtId = createData.id
      const newText = 'Updated text'

      // Update the thought
      // const { data, ok, status } = await apiPatch(request, `/api/thoughts/${thoughtId}`, {
      //   text: newText
      // })

      // expect(ok).toBe(true)
      // expect(status).toBe(200)
      // expect(data.text).toBe(newText)
    })
  })

  test.describe('DELETE /api/thoughts/[id] - Delete thought', () => {
    test.skip('deletes a thought', async ({ request }) => {
      // Note: This test is skipped - implement when DELETE endpoint is confirmed
      // Create a thought first
      const { data: createData } = await apiPost(request, '/thoughts', {
        text: 'Thought to delete'
      })

      const thoughtId = createData.id

      // Delete the thought
      // const { ok, status } = await apiDelete(request, `/api/thoughts/${thoughtId}`)

      // expect(ok).toBe(true)
      // expect(status).toBe(200)

      // Verify deletion
      // const { ok: getOk, status: getStatus } = await apiGet(request, `/api/thoughts/${thoughtId}`)
      // expect(getOk).toBe(false)
      // expect(getStatus).toBe(404)
    })
  })
})
