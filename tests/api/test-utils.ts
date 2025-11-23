import { APIRequestContext } from '@playwright/test'

/**
 * Common test utilities for API integration tests
 */

export const API_BASE_URL = 'http://localhost:3002/api'

/**
 * Make a GET request and parse JSON response
 */
export async function apiGet(request: APIRequestContext, endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${API_BASE_URL}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
  }

  const response = await request.get(url.toString())
  const data = response.ok() ? await response.json() : null

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
export async function apiPost(request: APIRequestContext, endpoint: string, body: any) {
  const response = await request.post(`${API_BASE_URL}${endpoint}`, {
    data: body,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  const data = response.ok() ? await response.json() : null

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
export async function apiPatch(request: APIRequestContext, endpoint: string, body: any) {
  const response = await request.patch(`${API_BASE_URL}${endpoint}`, {
    data: body,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  const data = response.ok() ? await response.json() : null

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
  const data = response.ok() ? await response.json() : null

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
