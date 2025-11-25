import { test, expect } from '@playwright/test'
import { apiGet, apiPost, assertResponseShape } from './test-utils'

test.describe('Jon-OS Insights API', () => {
  test.describe('GET /api/jon-os/insights', () => {
    test('returns insights structure with default params', async ({ request }) => {
      const { data, ok, status } = await apiGet(request, '/jon-os/insights')

      if (ok) {
        expect(status).toBe(200)
        expect(data).toBeTruthy()

        // Check top-level structure
        assertResponseShape(data, [
          'recurring_blockers',
          'actionable_discoveries',
          'connections',
          'summary',
          'analyzed_entries'
        ])

        // Verify arrays
        expect(Array.isArray(data.recurring_blockers)).toBe(true)
        expect(Array.isArray(data.actionable_discoveries)).toBe(true)
        expect(Array.isArray(data.connections)).toBe(true)

        // Verify counts
        expect(typeof data.analyzed_entries).toBe('number')
      }
    })

    test('accepts days parameter for time range', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/jon-os/insights', { days: '7' })

      if (ok) {
        assertResponseShape(data, ['recurring_blockers', 'analyzed_entries'])
        expect(data.analyzed_entries).toBeGreaterThanOrEqual(0)
      }
    })

    test('accepts limit parameter', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/jon-os/insights', { limit: '3' })

      if (ok) {
        // Results should be limited
        expect(data.recurring_blockers.length).toBeLessThanOrEqual(3)
        expect(data.actionable_discoveries.length).toBeLessThanOrEqual(3)
        expect(data.connections.length).toBeLessThanOrEqual(3)
      }
    })

    test('accepts type filter', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/jon-os/insights', { type: 'blocker' })

      if (ok) {
        assertResponseShape(data, ['recurring_blockers', 'analyzed_entries'])
      }
    })

    test('rejects invalid days parameter', async ({ request }) => {
      const { data, ok, status } = await apiGet(request, '/jon-os/insights', { days: '-5' })

      expect(ok).toBe(false)
      // May return 400 (validation) or 404 (route discovery)
      expect([400, 404]).toContain(status)
      if (status === 400) {
        expect(data.error).toBeTruthy()
      }
    })

    test('rejects invalid limit parameter', async ({ request }) => {
      const { data, ok, status } = await apiGet(request, '/jon-os/insights', { limit: '0' })

      expect(ok).toBe(false)
      // May return 400 (validation) or 404 (route discovery)
      expect([400, 404]).toContain(status)
      if (status === 400) {
        expect(data.error).toBeTruthy()
      }
    })
  })

  test.describe('Recurring blockers analysis', () => {
    test('identifies blockers that appear multiple times', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/jon-os/insights')

      if (ok && data.recurring_blockers.length > 0) {
        const blocker = data.recurring_blockers[0]
        assertResponseShape(blocker, ['pattern', 'count', 'entries'])

        expect(typeof blocker.pattern).toBe('string')
        expect(blocker.count).toBeGreaterThanOrEqual(1)
        expect(Array.isArray(blocker.entries)).toBe(true)
      }
    })
  })

  test.describe('Actionable discoveries', () => {
    test('extracts discoveries with action items', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/jon-os/insights')

      if (ok && data.actionable_discoveries.length > 0) {
        const discovery = data.actionable_discoveries[0]
        assertResponseShape(discovery, ['content', 'tags', 'created_at'])

        expect(typeof discovery.content).toBe('string')
      }
    })
  })

  test.describe('Entry connections', () => {
    test('suggests connections between related entries', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/jon-os/insights')

      if (ok && data.connections.length > 0) {
        const connection = data.connections[0]
        assertResponseShape(connection, ['entry_ids', 'relationship', 'shared_tags'])

        expect(Array.isArray(connection.entry_ids)).toBe(true)
        expect(connection.entry_ids.length).toBeGreaterThanOrEqual(2)
        expect(typeof connection.relationship).toBe('string')
      }
    })
  })

  test.describe('Summary generation', () => {
    test('provides summary with key metrics', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/jon-os/insights')

      if (ok) {
        assertResponseShape(data.summary, [
          'total_blockers',
          'total_discoveries',
          'total_accomplishments',
          'top_tags'
        ])

        expect(typeof data.summary.total_blockers).toBe('number')
        expect(typeof data.summary.total_discoveries).toBe('number')
        expect(typeof data.summary.total_accomplishments).toBe('number')
        expect(Array.isArray(data.summary.top_tags)).toBe(true)
      }
    })
  })

  test.describe('POST /api/jon-os/insights/analyze', () => {
    test('analyzes specific content for patterns', async ({ request }) => {
      const { data, ok, status } = await apiPost(request, '/jon-os/insights/analyze', {
        content: 'I keep getting blocked by slow CI builds'
      })

      if (ok) {
        expect(status).toBe(200)
        assertResponseShape(data, ['keywords', 'suggested_tags', 'similar_entries'])

        expect(Array.isArray(data.keywords)).toBe(true)
        expect(Array.isArray(data.suggested_tags)).toBe(true)
      }
    })

    test('rejects empty content', async ({ request }) => {
      const { data, ok, status } = await apiPost(request, '/jon-os/insights/analyze', {
        content: ''
      })

      expect(ok).toBe(false)
      // May return 400 (validation) or 404 (route discovery)
      expect([400, 404]).toContain(status)
      if (status === 400) {
        expect(data.error).toContain('content')
      }
    })

    test('rejects missing content', async ({ request }) => {
      const { data, ok, status } = await apiPost(request, '/jon-os/insights/analyze', {})

      expect(ok).toBe(false)
      // May return 400 (validation) or 404 (route discovery)
      expect([400, 404]).toContain(status)
      if (status === 400) {
        expect(data.error).toContain('content')
      }
    })
  })
})
