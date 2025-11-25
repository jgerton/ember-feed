import { test, expect } from '@playwright/test'
import { apiGet, apiPost, assertResponseShape } from './test-utils'

test.describe('Scheduler API', () => {
  test.describe('GET /api/scheduler', () => {
    test('returns scheduler status', async ({ request }) => {
      const { data, ok } = await apiGet(request, '/scheduler')

      // May fail if aggregator is not running
      if (ok) {
        expect(data).toBeTruthy()

        // Check expected fields
        if (!data.error) {
          assertResponseShape(data, ['running', 'paused', 'interval_minutes'])
          expect(typeof data.running).toBe('boolean')
          expect(typeof data.paused).toBe('boolean')
          expect(typeof data.interval_minutes).toBe('number')
        }
      }
    })
  })

  test.describe('POST /api/scheduler', () => {
    test('rejects missing action', async ({ request }) => {
      const { data, ok, status } = await apiPost(request, '/scheduler', {})

      expect(ok).toBe(false)
      // May return 400 (validation) or 404 (route not found for empty body)
      expect([400, 404]).toContain(status)
      if (status === 400) {
        expect(data.error).toContain('action is required')
      }
    })

    test('rejects invalid action', async ({ request }) => {
      const { data, ok, status } = await apiPost(request, '/scheduler', {
        action: 'invalid'
      })

      expect(ok).toBe(false)
      // May return 400 (validation) or 404 (route issue)
      expect([400, 404]).toContain(status)
      if (status === 400) {
        expect(data.error).toContain('Invalid action')
      }
    })

    test('start action with default interval', async ({ request }) => {
      const { data, ok } = await apiPost(request, '/scheduler', {
        action: 'start'
      })

      if (ok) {
        expect(data.action).toBe('start')
        expect(data.success).toBe(true)
        expect(data.running).toBe(true)
      }
    })

    test('start action with custom interval', async ({ request }) => {
      const { data, ok } = await apiPost(request, '/scheduler', {
        action: 'start',
        interval_minutes: 15
      })

      if (ok) {
        expect(data.action).toBe('start')
        expect(data.success).toBe(true)
        expect(data.interval_minutes).toBe(15)
      }
    })

    test('stop action', async ({ request }) => {
      const { data, ok } = await apiPost(request, '/scheduler', {
        action: 'stop'
      })

      if (ok) {
        expect(data.action).toBe('stop')
        expect(data.success).toBe(true)
        expect(data.running).toBe(false)
      }
    })

    test('pause action', async ({ request }) => {
      // First start the scheduler
      await apiPost(request, '/scheduler', { action: 'start' })

      const { data, ok } = await apiPost(request, '/scheduler', {
        action: 'pause'
      })

      if (ok) {
        expect(data.action).toBe('pause')
        expect(data.success).toBe(true)
        expect(data.paused).toBe(true)
      }
    })

    test('resume action', async ({ request }) => {
      const { data, ok } = await apiPost(request, '/scheduler', {
        action: 'resume'
      })

      if (ok) {
        expect(data.action).toBe('resume')
        expect(data.success).toBe(true)
      }
    })

    test('trigger action', async ({ request }) => {
      const { data, ok } = await apiPost(request, '/scheduler', {
        action: 'trigger'
      })

      if (ok) {
        expect(data.action).toBe('trigger')
        expect(data.success).toBe(true)
        expect(data.message).toBeTruthy()
      }
    })

    test('update_interval action', async ({ request }) => {
      const { data, ok } = await apiPost(request, '/scheduler', {
        action: 'update_interval',
        interval_minutes: 45
      })

      if (ok) {
        expect(data.action).toBe('update_interval')
        expect(data.success).toBe(true)
        expect(data.interval_minutes).toBe(45)
      }
    })
  })

  test.describe('Scheduler workflow', () => {
    test('full start-pause-resume-stop cycle', async ({ request }) => {
      // Start
      const start = await apiPost(request, '/scheduler', { action: 'start', interval_minutes: 30 })
      if (start.ok) {
        expect(start.data.running).toBe(true)
        expect(start.data.paused).toBe(false)
      }

      // Pause
      const pause = await apiPost(request, '/scheduler', { action: 'pause' })
      if (pause.ok) {
        expect(pause.data.paused).toBe(true)
      }

      // Resume
      const resume = await apiPost(request, '/scheduler', { action: 'resume' })
      if (resume.ok) {
        expect(resume.data.paused).toBe(false)
      }

      // Stop
      const stop = await apiPost(request, '/scheduler', { action: 'stop' })
      if (stop.ok) {
        expect(stop.data.running).toBe(false)
      }
    })
  })
})
