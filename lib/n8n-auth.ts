import { NextResponse } from 'next/server'

/**
 * Validates the n8n API key from request headers
 * Used to secure /api/n8n/* endpoints from unauthorized access
 */
export function validateN8nApiKey(request: Request): boolean {
  const apiKey = request.headers.get('X-N8N-API-KEY')
  const expectedKey = process.env.N8N_API_KEY

  // If no API key is configured, allow requests (development mode)
  if (!expectedKey) {
    console.warn('N8N_API_KEY not configured - n8n endpoints are unprotected')
    return true
  }

  return apiKey === expectedKey
}

/**
 * Returns a 401 Unauthorized response for invalid API keys
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized', message: 'Invalid or missing X-N8N-API-KEY header' },
    { status: 401 }
  )
}

/**
 * Middleware helper - validates API key and returns error response if invalid
 * Returns null if valid, NextResponse if invalid
 */
export function requireN8nAuth(request: Request): NextResponse | null {
  if (!validateN8nApiKey(request)) {
    return unauthorizedResponse()
  }
  return null
}
