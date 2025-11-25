import { useState, useEffect } from 'react'

// URL detection regex - matches http/https URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/g

interface UseUrlDetectionResult {
  detectedUrl: string | null
  hasUrl: boolean
  clearDetectedUrl: () => void
}

/**
 * Hook to detect URLs in text content
 * Automatically extracts the first valid URL from text
 */
export function useUrlDetection(text: string, debounceMs: number = 500): UseUrlDetectionResult {
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null)
  const [hasUrl, setHasUrl] = useState(false)

  useEffect(() => {
    // Debounce URL detection to avoid excessive processing
    const timeoutId = setTimeout(() => {
      if (!text || text.trim().length === 0) {
        setDetectedUrl(null)
        setHasUrl(false)
        return
      }

      // Extract all URLs from text
      const matches = text.match(URL_REGEX)

      if (matches && matches.length > 0) {
        // Get the first URL
        const firstUrl = matches[0]

        // Validate URL format
        try {
          const url = new URL(firstUrl)
          // Only accept http/https protocols
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            setDetectedUrl(firstUrl)
            setHasUrl(true)
            return
          }
        } catch (error) {
          // Invalid URL, ignore
        }
      }

      // No valid URL found
      setDetectedUrl(null)
      setHasUrl(false)
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [text, debounceMs])

  const clearDetectedUrl = () => {
    setDetectedUrl(null)
    setHasUrl(false)
  }

  return {
    detectedUrl,
    hasUrl,
    clearDetectedUrl
  }
}
