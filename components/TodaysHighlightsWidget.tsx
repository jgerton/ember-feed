'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import FilterBar, { DateFilter } from '@/components/FilterBar'

interface Article {
  id: string
  title: string
  description: string
  url: string
  source: string
  score: number
  publishedAt: string
  topics?: Array<{
    topic: {
      name: string
      slug: string
    }
  }>
}

interface Topic {
  slug: string
  name: string
}

interface TodaysHighlightsWidgetProps {
  onArticleClick?: (article: Article) => void
}

/**
 * Today's Highlights Widget
 *
 * Article list with:
 * - FilterBar for topic/source/date filtering
 * - Infinite scroll to load more articles
 * - View analytics tracking via IntersectionObserver
 */
export default function TodaysHighlightsWidget({
  onArticleClick
}: TodaysHighlightsWidgetProps) {
  // Article state
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [topics, setTopics] = useState<Topic[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')

  // Refs for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Calculate date range based on filter
  const getDateRange = useCallback(() => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (dateFilter) {
      case 'today':
        return startOfDay.toISOString()
      case '3days':
        return new Date(startOfDay.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
      case 'week':
        return new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      case 'all':
      default:
        return null
    }
  }, [dateFilter])

  // Build query params
  const buildQueryParams = useCallback((cursorValue: string | null = null) => {
    const params = new URLSearchParams()
    params.append('limit', '20')

    if (cursorValue) {
      params.append('cursor', cursorValue)
    }

    if (selectedTopic) {
      params.append('topic', selectedTopic)
    }

    if (selectedSource) {
      params.append('source', selectedSource)
    }

    const startDate = getDateRange()
    if (startDate) {
      params.append('startDate', startDate)
    }

    return params.toString()
  }, [selectedTopic, selectedSource, getDateRange])

  // Fetch articles
  const fetchArticles = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(null)
      }

      const queryString = buildQueryParams(isLoadMore ? cursor : null)
      const res = await fetch(`/api/articles?${queryString}`)

      if (!res.ok) throw new Error('Failed to fetch articles')

      const data = await res.json()
      const newArticles = data.articles || []

      if (isLoadMore) {
        setArticles(prev => [...prev, ...newArticles])
      } else {
        setArticles(newArticles)
      }

      // Update pagination state
      if (data.pagination) {
        setHasMore(data.pagination.hasMore || false)
        // Use the last article's ID as cursor for next fetch
        if (newArticles.length > 0) {
          setCursor(newArticles[newArticles.length - 1].id)
        }
      } else {
        setHasMore(newArticles.length >= 20)
        if (newArticles.length > 0) {
          setCursor(newArticles[newArticles.length - 1].id)
        }
      }
    } catch (err) {
      console.error('Error fetching articles:', err)
      setError('Failed to load articles')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [buildQueryParams, cursor])

  // Fetch topics for filter
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await fetch('/api/topics')
        if (res.ok) {
          const data = await res.json()
          setTopics(data.topics || data || [])
        }
      } catch (err) {
        console.error('Error fetching topics:', err)
      }
    }
    fetchTopics()
  }, [])

  // Extract unique sources from articles
  useEffect(() => {
    const uniqueSources = [...new Set(articles.map(a => a.source))].sort()
    setSources(uniqueSources)
  }, [articles])

  // Initial fetch and fetch on filter change
  useEffect(() => {
    setCursor(null)
    setHasMore(true)
    fetchArticles(false)
  }, [selectedTopic, selectedSource, dateFilter])

  // Set up IntersectionObserver for infinite scroll
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchArticles(true)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loading, loadingMore, hasMore, fetchArticles])

  // Reset filters
  const resetFilters = () => {
    setSelectedTopic('')
    setSelectedSource('')
    setDateFilter('today')
  }

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <div>
      {/* Filter Bar */}
      <FilterBar
        topics={topics}
        sources={sources}
        selectedTopic={selectedTopic}
        selectedSource={selectedSource}
        dateFilter={dateFilter}
        onTopicChange={setSelectedTopic}
        onSourceChange={setSelectedSource}
        onDateChange={setDateFilter}
        loading={loading || loadingMore}
      />

      {/* Article Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-neutral-400">
          {loading ? 'Loading...' : `${articles.length} articles`}
          {hasMore && !loading && ' (scroll for more)'}
        </p>
        {(selectedTopic || selectedSource || dateFilter !== 'today') && (
          <button
            onClick={resetFilters}
            className="text-xs text-ember-500 hover:text-ember-400 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-400 mb-2">{error}</p>
          <button
            onClick={() => fetchArticles(false)}
            className="text-ember-500 hover:text-ember-400 text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State (initial) */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-medium rounded-lg p-3 animate-pulse">
              <div className="h-5 bg-neutral-700 rounded w-3/4 mb-2" />
              <div className="h-4 bg-neutral-700/50 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && articles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-500 mb-2">No articles found matching your filters.</p>
          <button
            onClick={resetFilters}
            className="text-ember-500 hover:text-ember-400"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Article List */}
      {!loading && !error && articles.length > 0 && (
        <div className="space-y-2">
          {articles.map((article, idx) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onArticleClick?.(article)}
              className="block glass-medium rounded-lg p-3 hover:glass-light transition-all group"
            >
              <div className="flex items-start gap-3">
                <span className="text-ember-500 font-bold text-lg min-w-[24px]">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-neutral-100 font-medium group-hover:text-ember-400 transition-colors line-clamp-2">
                    {article.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400 flex-wrap">
                    <span>{article.source}</span>
                    <span>-</span>
                    <span>{formatTimeAgo(article.publishedAt)}</span>
                    <span>-</span>
                    <span>Score: {article.score}</span>
                    {article.topics && article.topics.length > 0 && (
                      <>
                        <span>-</span>
                        <span className="text-ember-500">{article.topics[0].topic.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </a>
          ))}

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-1" />

          {/* Loading More Indicator */}
          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-ember-500/30 border-t-ember-500 rounded-full animate-spin" />
            </div>
          )}

          {/* No More Results */}
          {!hasMore && articles.length > 0 && (
            <div className="text-center py-4 text-neutral-500 text-sm">
              No more articles to load.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
