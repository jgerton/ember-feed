import { useState, useEffect, useRef } from 'react'

interface UrlMetadata {
  title: string
  description: string
  author: string | null
  image: string | null
  publishedDate: string | null
  siteName: string
  feeds: Array<{
    url: string
    title: string
    type: string
    isSubscribed?: boolean
    feedId?: string
  }>
}

interface UseUrlMetadataResult {
  metadata: UrlMetadata | null
  loading: boolean
  error: string | null
  extractMetadata: (url: string) => Promise<void>
  reset: () => void
}

/**
 * Custom hook for extracting URL metadata and checking RSS feed subscriptions
 *
 * Features:
 * - Debounced metadata extraction (500ms)
 * - Automatic RSS feed discovery
 * - Subscription status checking for discovered feeds
 * - Error handling and loading states
 *
 * @param debounceMs - Debounce delay in milliseconds (default: 500)
 */
export function useUrlMetadata(debounceMs: number = 500): UseUrlMetadataResult {
  const [metadata, setMetadata] = useState<UrlMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  /**
   * Extract metadata from a URL with debouncing
   */
  const extractMetadata = async (url: string) => {
    // Clear previous debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Reset error state
    setError(null)

    // Validate URL format
    if (!url || url.trim().length === 0) {
      setMetadata(null)
      setLoading(false)
      return
    }

    try {
      new URL(url)
    } catch {
      setError('Invalid URL format')
      setMetadata(null)
      setLoading(false)
      return
    }

    // Set loading state immediately
    setLoading(true)

    // Debounce the actual extraction
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        // Create new abort controller for this request
        abortControllerRef.current = new AbortController()

        // Extract metadata
        const metadataRes = await fetch('/api/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
          signal: abortControllerRef.current.signal
        })

        if (!metadataRes.ok) {
          const errorData = await metadataRes.json()
          throw new Error(errorData.error || 'Failed to extract metadata')
        }

        const metadataData = await metadataRes.json()

        // Check subscription status for each discovered feed
        const feedsWithStatus = await Promise.all(
          metadataData.feeds.map(async (feed: { url: string; title: string; type: string }) => {
            try {
              const checkRes = await fetch('/api/feeds/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: feed.url }),
                signal: abortControllerRef.current?.signal
              })

              if (checkRes.ok) {
                const checkData = await checkRes.json()
                return {
                  ...feed,
                  isSubscribed: checkData.exists,
                  feedId: checkData.feed?.id
                }
              }
            } catch (err) {
              // If feed check fails, just mark as not subscribed
              console.error('Error checking feed subscription:', err)
            }

            return {
              ...feed,
              isSubscribed: false
            }
          })
        )

        setMetadata({
          ...metadataData,
          feeds: feedsWithStatus
        })
        setLoading(false)
      } catch (err) {
        // Don't show error if request was aborted (user is still typing)
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to extract metadata'
        setError(errorMessage)
        setMetadata(null)
        setLoading(false)
      }
    }, debounceMs)
  }

  /**
   * Reset the hook state
   */
  const reset = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setMetadata(null)
    setLoading(false)
    setError(null)
  }

  return {
    metadata,
    loading,
    error,
    extractMetadata,
    reset
  }
}
