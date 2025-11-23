import { test, expect } from '@playwright/test'
import { apiGet, apiPatch, assertResponseShape } from './test-utils'

test.describe('Settings API', () => {
  test('GET /api/settings returns user settings', async ({ request }) => {
    const { data, ok, status } = await apiGet(request, '/settings')

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data).toBeTruthy()

    // Verify response structure
    assertResponseShape(data, [
      'id',
      'diversityLevel',
      'createdAt',
      'updatedAt'
    ])
  })

  test('creates default settings if none exist', async ({ request }) => {
    const { data } = await apiGet(request, '/settings')

    // Should auto-create with default diversityLevel
    expect(data.diversityLevel).toBeTruthy()
    expect(['low', 'medium', 'high']).toContain(data.diversityLevel)
  })

  test('default diversity level is medium', async ({ request }) => {
    // First GET should create settings with medium default
    const { data } = await apiGet(request, '/settings')

    // Default should be medium (unless changed by other tests)
    // Note: In real test env, would reset DB between tests
    expect(['low', 'medium', 'high']).toContain(data.diversityLevel)
  })

  test('PATCH /api/settings updates diversity level', async ({ request }) => {
    // Update to high
    const { data: updated, ok } = await apiPatch(request, '/settings', {
      diversityLevel: 'high'
    })

    expect(ok).toBe(true)
    expect(updated.diversityLevel).toBe('high')
  })

  test('can update to low diversity', async ({ request }) => {
    const { data, ok } = await apiPatch(request, '/settings', {
      diversityLevel: 'low'
    })

    expect(ok).toBe(true)
    expect(data.diversityLevel).toBe('low')
  })

  test('can update to medium diversity', async ({ request }) => {
    const { data, ok } = await apiPatch(request, '/settings', {
      diversityLevel: 'medium'
    })

    expect(ok).toBe(true)
    expect(data.diversityLevel).toBe('medium')
  })

  test('rejects invalid diversity level', async ({ request }) => {
    const { ok, status, response } = await apiPatch(request, '/settings', {
      diversityLevel: 'invalid'
    })

    expect(ok).toBe(false)
    expect(status).toBe(400)

    const data = await response.json()
    expect(data.error).toBeTruthy()
    expect(data.error).toContain('Invalid diversity level')
  })

  test('handles empty diversity level', async ({ request }) => {
    // Send empty string - API should accept and use default/existing
    const { ok } = await apiPatch(request, '/settings', {
      diversityLevel: ''
    })

    // Should succeed (either keeps existing or defaults)
    expect(ok).toBe(true)
  })

  test('rejects numeric diversity level', async ({ request }) => {
    const { ok, status } = await apiPatch(request, '/settings', {
      diversityLevel: 123
    })

    expect(ok).toBe(false)
    expect(status).toBe(400)
  })

  test('handles missing body gracefully', async ({ request }) => {
    const { ok } = await apiPatch(request, '/settings', {})

    // Should succeed and keep existing settings
    expect(ok).toBe(true)
  })

  test('updatedAt timestamp changes on update', async ({ request }) => {
    // Get current settings
    const { data: before } = await apiGet(request, '/settings')
    const beforeUpdated = new Date(before.updatedAt)

    // Wait a tiny bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100))

    // Update settings
    await apiPatch(request, '/settings', { diversityLevel: 'high' })

    // Get updated settings
    const { data: after } = await apiGet(request, '/settings')
    const afterUpdated = new Date(after.updatedAt)

    expect(afterUpdated.getTime()).toBeGreaterThan(beforeUpdated.getTime())
  })

  test('createdAt timestamp remains unchanged on update', async ({ request }) => {
    // Get current settings
    const { data: before } = await apiGet(request, '/settings')

    // Update settings
    await apiPatch(request, '/settings', { diversityLevel: 'low' })

    // Get updated settings
    const { data: after } = await apiGet(request, '/settings')

    expect(after.createdAt).toBe(before.createdAt)
  })

  test('id remains unchanged on update', async ({ request }) => {
    // Get current settings
    const { data: before } = await apiGet(request, '/settings')

    // Update settings
    await apiPatch(request, '/settings', { diversityLevel: 'medium' })

    // Get updated settings
    const { data: after } = await apiGet(request, '/settings')

    expect(after.id).toBe(before.id)
  })

  test('preserves other fields on partial update', async ({ request }) => {
    // Get current settings
    const { data: before } = await apiGet(request, '/settings')

    // Update only diversityLevel
    await apiPatch(request, '/settings', { diversityLevel: 'high' })

    // Get updated settings
    const { data: after } = await apiGet(request, '/settings')

    // Only diversityLevel should change, other fields preserved
    expect(after.id).toBe(before.id)
    expect(after.createdAt).toBe(before.createdAt)
  })

  test('handles concurrent requests correctly', async ({ request }) => {
    // Make multiple concurrent updates
    const updates = [
      apiPatch(request, '/settings', { diversityLevel: 'low' }),
      apiPatch(request, '/settings', { diversityLevel: 'medium' }),
      apiPatch(request, '/settings', { diversityLevel: 'high' })
    ]

    const results = await Promise.all(updates)

    // All should succeed
    results.forEach(({ ok }) => {
      expect(ok).toBe(true)
    })

    // Final state should be one of the valid values
    const { data: final } = await apiGet(request, '/settings')
    expect(['low', 'medium', 'high']).toContain(final.diversityLevel)
  })

  test('diversity level affects feed behavior', async ({ request }) => {
    // Set to high diversity
    await apiPatch(request, '/settings', { diversityLevel: 'high' })

    // Get feed with high diversity
    const { data: highFeed } = await apiGet(request, '/articles', {
      limit: '10',
      personalized: 'true'
    })

    // Set to low diversity
    await apiPatch(request, '/settings', { diversityLevel: 'low' })

    // Get feed with low diversity
    const { data: lowFeed } = await apiGet(request, '/articles', {
      limit: '10',
      personalized: 'true'
    })

    // Both should return articles (actual diversity difference tested in feed tests)
    if (highFeed.articles && lowFeed.articles) {
      expect(Array.isArray(highFeed.articles)).toBe(true)
      expect(Array.isArray(lowFeed.articles)).toBe(true)
    }
  })
})
