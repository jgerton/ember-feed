import { useState } from 'react'

interface UseFeedValidationResult {
  validating: boolean
  isValid: boolean | null
  error: string | null
  suggestion: string | null
  feedName: string | null
  articlesCount: number | null
  validateFeedUrl: (url: string) => Promise<void>
  reset: () => void
}

/**
 * Hook to validate RSS feed URLs
 * Calls the /api/feeds/validate endpoint to test feed accessibility
 */
export function useFeedValidation(): UseFeedValidationResult {
  const [validating, setValidating] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [feedName, setFeedName] = useState<string | null>(null)
  const [articlesCount, setArticlesCount] = useState<number | null>(null)

  const validateFeedUrl = async (url: string) => {
    if (!url || url.trim().length === 0) {
      reset()
      return
    }

    setValidating(true)
    setError(null)
    setSuggestion(null)
    setFeedName(null)
    setArticlesCount(null)

    try {
      // Validate URL format first
      try {
        new URL(url)
      } catch {
        setIsValid(false)
        setError('Invalid URL format')
        setSuggestion('Please enter a valid http:// or https:// URL')
        setValidating(false)
        return
      }

      const response = await fetch('/api/feeds/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsValid(true)
        setFeedName(data.feedName || null)
        setArticlesCount(data.articlesCount || null)
      } else {
        setIsValid(false)
        setError(data.error || 'Feed validation failed')
        setSuggestion(data.suggestion || null)
      }
    } catch (err) {
      setIsValid(false)
      setError('Failed to validate feed')
      setSuggestion('Please check your internet connection and try again')
      console.error('Feed validation error:', err)
    } finally {
      setValidating(false)
    }
  }

  const reset = () => {
    setValidating(false)
    setIsValid(null)
    setError(null)
    setSuggestion(null)
    setFeedName(null)
    setArticlesCount(null)
  }

  return {
    validating,
    isValid,
    error,
    suggestion,
    feedName,
    articlesCount,
    validateFeedUrl,
    reset
  }
}
