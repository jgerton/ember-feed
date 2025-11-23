import { useEffect, useRef, useState } from 'react'

interface UseArticleAnalyticsOptions {
  articleId: string
  enabled?: boolean
}

interface AnalyticsData {
  articleId: string
  action: string
  durationSeconds?: number
  scrollPercentage?: number
}

export function useArticleAnalytics({ articleId, enabled = true }: UseArticleAnalyticsOptions) {
  const [isTracking, setIsTracking] = useState(false)
  const startTimeRef = useRef<number>(Date.now())
  const visibilityStartRef = useRef<number>(Date.now())
  const totalVisibleTimeRef = useRef<number>(0)
  const maxScrollPercentageRef = useRef<number>(0)
  const viewEventSentRef = useRef<boolean>(false)

  // Send analytics data to API
  const sendAnalytics = async (data: AnalyticsData) => {
    if (!enabled) return

    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
    } catch (error) {
      console.error('Failed to send analytics:', error)
    }
  }

  // Track view event (article opened)
  useEffect(() => {
    if (!enabled || viewEventSentRef.current) return

    sendAnalytics({
      articleId,
      action: 'view'
    })

    viewEventSentRef.current = true
    setIsTracking(true)
  }, [articleId, enabled])

  // Track time spent using Page Visibility API
  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page became hidden - accumulate visible time
        const visibleDuration = Date.now() - visibilityStartRef.current
        totalVisibleTimeRef.current += visibleDuration
      } else {
        // Page became visible - restart timer
        visibilityStartRef.current = Date.now()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled])

  // Track scroll percentage
  const trackScroll = (containerRef: React.RefObject<HTMLElement>) => {
    if (!enabled || !containerRef.current) return

    const container = containerRef.current
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight

    const scrollPercentage = scrollHeight > clientHeight
      ? Math.floor((scrollTop / (scrollHeight - clientHeight)) * 100)
      : 100

    // Track maximum scroll percentage
    if (scrollPercentage > maxScrollPercentageRef.current) {
      maxScrollPercentageRef.current = scrollPercentage
    }
  }

  // Send final analytics when unmounting or leaving
  useEffect(() => {
    if (!enabled) return

    const sendFinalAnalytics = () => {
      // Calculate total visible time
      if (!document.hidden) {
        const visibleDuration = Date.now() - visibilityStartRef.current
        totalVisibleTimeRef.current += visibleDuration
      }

      const durationSeconds = Math.floor(totalVisibleTimeRef.current / 1000)
      const scrollPercentage = maxScrollPercentageRef.current

      // Only send if user spent meaningful time (> 2 seconds)
      if (durationSeconds > 2) {
        sendAnalytics({
          articleId,
          action: 'read',
          durationSeconds,
          scrollPercentage
        })
      }
    }

    // Send analytics before page unload
    window.addEventListener('beforeunload', sendFinalAnalytics)

    return () => {
      window.removeEventListener('beforeunload', sendFinalAnalytics)
      sendFinalAnalytics()
    }
  }, [articleId, enabled])

  return {
    isTracking,
    trackScroll,
    currentScrollPercentage: maxScrollPercentageRef.current,
    durationSeconds: Math.floor(totalVisibleTimeRef.current / 1000)
  }
}
