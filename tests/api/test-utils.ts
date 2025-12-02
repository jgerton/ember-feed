import { APIRequestContext } from '@playwright/test'

/**
 * Common test utilities for API integration tests
 */

export const API_BASE_URL = 'http://localhost:3002/api'

/**
 * Options for API requests
 */
export interface ApiRequestOptions {
  /** Include X-N8N-API-KEY header for n8n endpoints */
  n8nAuth?: boolean
}

/**
 * Make a GET request and parse JSON response
 */
export async function apiGet(
  request: APIRequestContext,
  endpoint: string,
  params?: Record<string, string>,
  options?: ApiRequestOptions
) {
  const url = new URL(`${API_BASE_URL}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
  }

  const headers: Record<string, string> = {}
  if (options?.n8nAuth) {
    headers['X-N8N-API-KEY'] = process.env.N8N_API_KEY || 'test-api-key'
  }

  const response = await request.get(url.toString(), { headers })

  // Always try to parse JSON for both success and error responses
  let data = null
  try {
    data = await response.json()
  } catch {
    // If JSON parsing fails, data stays null
  }

  return {
    response,
    data,
    status: response.status(),
    ok: response.ok()
  }
}

/**
 * Make a POST request with JSON body
 */
export async function apiPost(
  request: APIRequestContext,
  endpoint: string,
  body: any,
  options?: ApiRequestOptions
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (options?.n8nAuth) {
    headers['X-N8N-API-KEY'] = process.env.N8N_API_KEY || 'test-api-key'
  }

  const response = await request.post(`${API_BASE_URL}${endpoint}`, {
    data: body,
    headers
  })

  // Always try to parse JSON for both success and error responses
  let data = null
  try {
    data = await response.json()
  } catch {
    // If JSON parsing fails, data stays null
  }

  return {
    response,
    data,
    status: response.status(),
    ok: response.ok()
  }
}

/**
 * Make a PATCH request with JSON body
 */
export async function apiPatch(
  request: APIRequestContext,
  endpoint: string,
  body: any,
  options?: ApiRequestOptions
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (options?.n8nAuth) {
    headers['X-N8N-API-KEY'] = process.env.N8N_API_KEY || 'test-api-key'
  }

  const response = await request.patch(`${API_BASE_URL}${endpoint}`, {
    data: body,
    headers
  })

  // Always try to parse JSON for both success and error responses
  let data = null
  try {
    data = await response.json()
  } catch {
    // If JSON parsing fails, data stays null
  }

  return {
    response,
    data,
    status: response.status(),
    ok: response.ok()
  }
}

/**
 * Make a DELETE request
 */
export async function apiDelete(request: APIRequestContext, endpoint: string) {
  const response = await request.delete(`${API_BASE_URL}${endpoint}`)

  // Always try to parse JSON for both success and error responses
  let data = null
  try {
    data = await response.json()
  } catch {
    // If JSON parsing fails, data stays null
  }

  return {
    response,
    data,
    status: response.status(),
    ok: response.ok()
  }
}

/**
 * Assert response structure matches expected shape
 */
export function assertResponseShape(data: any, expectedKeys: string[]) {
  expectedKeys.forEach(key => {
    if (!(key in data)) {
      throw new Error(`Expected key "${key}" not found in response`)
    }
  })
}

/**
 * Assert array of objects all have expected keys
 */
export function assertArrayShape(arr: any[], expectedKeys: string[]) {
  if (!Array.isArray(arr)) {
    throw new Error('Expected array but got: ' + typeof arr)
  }

  arr.forEach((item, idx) => {
    expectedKeys.forEach(key => {
      if (!(key in item)) {
        throw new Error(`Item ${idx}: Expected key "${key}" not found`)
      }
    })
  })
}

/**
 * Sleep for specified milliseconds (for rate limiting tests, etc.)
 */
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Clean up test data from the database.
 * Calls the /api/test/cleanup endpoint which requires TEST_MODE=true.
 *
 * @param request - Playwright APIRequestContext
 * @param options - Cleanup options
 * @param options.includeRedis - Also flush Redis test database (default: false)
 * @param options.since - Only delete records created after this timestamp (preserves existing data)
 * @param options.mode - 'all' wipes everything, 'since' uses the timestamp (default: 'all')
 * @throws Error if cleanup fails or TEST_MODE is not enabled
 */
export async function cleanupTestData(
  request: APIRequestContext,
  options: { includeRedis?: boolean; since?: string; mode?: 'all' | 'since' } = {}
) {
  const { includeRedis = false, since, mode } = options

  const response = await request.post(`${API_BASE_URL}/test/cleanup`, {
    data: { includeRedis, since, mode },
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok()) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `Test cleanup failed (${response.status()}): ${errorData.error || errorData.message || 'Unknown error'}`
    )
  }

  return response.json()
}

/**
 * Creates a test isolation context that tracks the start time and provides
 * cleanup that only removes records created during the test.
 *
 * @example
 * test.describe('My test suite', () => {
 *   let cleanup: TestCleanupContext
 *
 *   test.beforeAll(async ({ request }) => {
 *     cleanup = createTestCleanup()
 *   })
 *
 *   test.afterAll(async ({ request }) => {
 *     await cleanup.run(request)
 *   })
 *
 *   test('creates data', async ({ request }) => {
 *     // ... test that creates records ...
 *   })
 * })
 */
export interface TestCleanupContext {
  startTime: string
  run: (request: APIRequestContext, options?: { includeRedis?: boolean }) => Promise<any>
}

export function createTestCleanup(): TestCleanupContext {
  const startTime = new Date().toISOString()

  return {
    startTime,
    run: async (request: APIRequestContext, options: { includeRedis?: boolean } = {}) => {
      return cleanupTestData(request, {
        since: startTime,
        includeRedis: options.includeRedis,
      })
    },
  }
}

/**
 * Seed the test database with baseline data.
 * Calls the /api/test/seed endpoint which requires TEST_MODE=true.
 *
 * @param request - Playwright APIRequestContext
 * @param options - What to seed
 * @param options.feeds - Seed RSS feed sources (default: true)
 * @param options.topics - Seed topic categories (default: true)
 * @param options.settings - Seed default settings (default: true)
 * @param options.articles - Seed sample articles (default: false)
 */
export async function seedTestData(
  request: APIRequestContext,
  options: {
    feeds?: boolean
    topics?: boolean
    settings?: boolean
    articles?: boolean
  } = {}
) {
  const { feeds = true, topics = true, settings = true, articles = false } = options

  const response = await request.post(`${API_BASE_URL}/test/seed`, {
    data: { feeds, topics, settings, articles },
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok()) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `Test seed failed (${response.status()}): ${errorData.error || errorData.message || 'Unknown error'}`
    )
  }

  return response.json()
}
