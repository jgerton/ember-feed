/**
 * Playwright Global Setup
 *
 * Runs once before all tests. When TEST_MODE=true, the app uses a separate
 * test database (ember_feed_test) that is completely isolated from production.
 *
 * This setup:
 * 1. Verifies TEST_MODE is enabled (app uses test database)
 * 2. Wipes all data from the test database for a clean slate
 * 3. Production data in ember_feed is never touched
 */

import { request } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002'

async function globalSetup() {
  console.log('Global setup: Preparing test database...')

  const context = await request.newContext({
    baseURL: BASE_URL,
  })

  try {
    // Verify TEST_MODE is enabled and get database info
    const infoResponse = await context.get('/api/test/cleanup')

    if (!infoResponse.ok()) {
      if (infoResponse.status() === 403) {
        console.warn('Global setup: TEST_MODE not enabled')
        console.warn('  Set TEST_MODE=true in docker-compose.yml to use isolated test database')
        console.warn('  Tests will run against PRODUCTION database!')
      }
      return
    }

    console.log('Global setup: TEST_MODE enabled - using isolated test database (ember_feed_test)')

    // Wipe all data from test database for a clean slate
    // This is safe because TEST_MODE means we're using ember_feed_test, not ember_feed
    const cleanupResponse = await context.post('/api/test/cleanup', {
      data: { mode: 'all', includeRedis: true },
      headers: { 'Content-Type': 'application/json' },
    })

    if (cleanupResponse.ok()) {
      const result = await cleanupResponse.json()
      console.log('Global setup: Test database reset complete')
      console.log(`  PostgreSQL: ${result.details?.postgresql || 'cleared'}`)
      console.log(`  Redis: ${result.details?.redis || 'cleared'}`)

      // Seed baseline data (feeds, topics, settings)
      const seedResponse = await context.post('/api/test/seed', {
        data: { feeds: true, topics: true, settings: true, articles: false },
        headers: { 'Content-Type': 'application/json' },
      })

      if (seedResponse.ok()) {
        const seedResult = await seedResponse.json()
        console.log('Global setup: Test data seeded')
        console.log(`  Feeds: ${seedResult.seeded?.feeds || 0}`)
        console.log(`  Topics: ${seedResult.seeded?.topics || 0}`)
        console.log(`  Settings: ${seedResult.seeded?.settings || 0}`)
      } else {
        console.warn('Global setup: Failed to seed test data (tests may still work)')
      }
    } else {
      console.error('Global setup: Failed to reset test database')
      const errorBody = await cleanupResponse.text().catch(() => 'Unknown error')
      console.error(`  Error: ${errorBody}`)
    }
  } catch (error) {
    // Don't fail if the server is not running yet
    console.warn('Global setup: Could not connect to server')
    console.warn(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    console.warn('  Make sure docker-compose is running')
  } finally {
    await context.dispose()
  }
}

export default globalSetup
