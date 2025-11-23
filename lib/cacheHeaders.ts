import { NextResponse } from 'next/server'

/**
 * Cache configuration for different endpoint types
 */
export const CACHE_CONFIGS = {
  // Short-lived, frequently changing data
  dynamic: {
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 120, // 2 minutes
  },
  // Medium-lived, occasionally changing data
  semiStatic: {
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 600, // 10 minutes
  },
  // Long-lived, rarely changing data
  static: {
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 7200, // 2 hours
  },
} as const

type CacheConfig = keyof typeof CACHE_CONFIGS

/**
 * Simple hash function for ETags (FNV-1a algorithm)
 * We don't need cryptographic security for ETags, just a reasonably unique identifier
 */
function simpleHash(str: string): string {
  let hash = 2166136261 // FNV offset basis (32-bit)

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }

  // Convert to hex string
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Generate an ETag from response data
 * ETags allow browsers to do conditional requests (If-None-Match)
 */
export function generateETag(data: any): string {
  const content = typeof data === 'string' ? data : JSON.stringify(data)
  const hash = simpleHash(content)
  return `"${hash}"`
}

/**
 * Check if request has matching ETag (for 304 Not Modified)
 */
export function checkETag(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get('if-none-match')
  return ifNoneMatch === etag
}

/**
 * Add cache headers to a NextResponse
 */
export function addCacheHeaders(
  response: NextResponse,
  config: CacheConfig = 'dynamic',
  etag?: string
): NextResponse {
  const cacheConfig = CACHE_CONFIGS[config]

  // Cache-Control header
  response.headers.set(
    'Cache-Control',
    `public, max-age=${cacheConfig.maxAge}, stale-while-revalidate=${cacheConfig.staleWhileRevalidate}`
  )

  // ETag for conditional requests
  if (etag) {
    response.headers.set('ETag', etag)
  }

  // Vary header to indicate response varies by encoding
  response.headers.set('Vary', 'Accept-Encoding')

  return response
}

/**
 * Create a cached JSON response with ETags and Cache-Control
 * Automatically handles 304 Not Modified responses
 */
export function createCachedResponse(
  request: Request,
  data: any,
  config: CacheConfig = 'dynamic'
): NextResponse {
  // Generate ETag from response data
  const etag = generateETag(data)

  // Check if client has current version (conditional request)
  if (checkETag(request, etag)) {
    // Client has current version, return 304 Not Modified
    const response = new NextResponse(null, { status: 304 })
    response.headers.set('ETag', etag)
    return response
  }

  // Create JSON response with cache headers
  const response = NextResponse.json(data)
  return addCacheHeaders(response, config, etag)
}
