'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Pagination from '@/components/Pagination'

interface Article {
  id: string
  title: string
  source: string
  url: string
  description: string
  publishedAt: string
  score: number
  createdAt: string
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

interface NewsWidgetProps {
  compact?: boolean
  limit?: number
  onViewAll?: () => void
  articles?: Article[]
  showPagination?: boolean
}

export default function NewsWidget({ compact = false, limit = 10, onViewAll, articles: providedArticles, showPagination = true }: NewsWidgetProps) {
  const [articles, setArticles] = useState<Article[]>(providedArticles || [])
  const [loading, setLoading] = useState(!providedArticles)
  const [viewedArticles, setViewedArticles] = useState<Set<string>>(new Set())
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set())
  const [savedArticles, setSavedArticles] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const articleRefs = useRef<Map<string, HTMLElement>>(new Map())

  useEffect(() => {
    if (providedArticles) {
      setArticles(providedArticles)
      setLoading(false)
    } else {
      fetchArticles(true, currentPage)
    }
    fetchSavedArticles()
  }, [limit, providedArticles, currentPage])

  const fetchSavedArticles = async () => {
    try {
      const res = await fetch('/api/saved-articles')
      if (!res.ok) return
      const saved = await res.json()
      const savedIds = new Set<string>(saved.map((s: { articleId: string }) => s.articleId))
      setSavedArticles(savedIds)
    } catch (error) {
      console.error('Error fetching saved articles:', error)
    }
  }

  const fetchArticles = async (personalized: boolean = true, page: number = 1) => {
    try {
      setLoading(true)
      const url = personalized
        ? `/api/articles?limit=${limit}&personalized=true`
        : `/api/articles?limit=${limit}&page=${page}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch articles')
      const data = await res.json()

      // Handle paginated response
      if (data.articles) {
        setArticles(data.articles)
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1)
        }
      } else if (Array.isArray(data)) {
        setArticles(data)
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of article list
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Track analytics event
  const trackAnalytics = async (articleId: string, action: string, extra?: { durationSeconds?: number; scrollPercentage?: number }) => {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          action,
          ...extra
        })
      })
    } catch (error) {
      console.error('Error tracking analytics:', error)
    }
  }

  const trackActivity = async (articleId: string, action: string) => {
    try {
      await fetch(`/api/articles/${articleId}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      // Update local score optimistically
      setArticles(articles.map(a => {
        if (a.id === articleId) {
          let adjustment = 0
          if (action === 'upvote') adjustment = 5
          if (action === 'downvote') adjustment = -5
          return { ...a, score: Math.max(0, Math.min(100, a.score + adjustment)) }
        }
        return a
      }))
    } catch (error) {
      console.error('Error tracking activity:', error)
    }
  }

  // Toggle save/unsave article
  const toggleSave = async (articleId: string) => {
    const isSaved = savedArticles.has(articleId)

    // Optimistic UI update
    setSavedArticles(prev => {
      const newSet = new Set(prev)
      if (isSaved) {
        newSet.delete(articleId)
      } else {
        newSet.add(articleId)
      }
      return newSet
    })

    try {
      if (isSaved) {
        // Find the saved article record to get its ID
        const res = await fetch('/api/saved-articles')
        if (res.ok) {
          const savedList = await res.json()
          const savedArticle = savedList.find((s: any) => s.articleId === articleId)
          if (savedArticle) {
            await fetch(`/api/saved-articles/${savedArticle.id}`, {
              method: 'DELETE'
            })
          }
        }
      } else {
        // Save the article
        await fetch('/api/saved-articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId })
        })
      }
    } catch (error) {
      console.error('Error toggling save:', error)
      // Revert optimistic update on error
      setSavedArticles(prev => {
        const newSet = new Set(prev)
        if (isSaved) {
          newSet.add(articleId)
        } else {
          newSet.delete(articleId)
        }
        return newSet
      })
    }
  }

  // Handle article view tracking with Intersection Observer
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const articleId = entry.target.getAttribute('data-article-id')
        if (articleId && !viewedArticles.has(articleId)) {
          // Track view event
          trackAnalytics(articleId, 'view')
          setViewedArticles(prev => new Set(prev).add(articleId))
        }
      }
    })
  }, [viewedArticles])

  // Set up Intersection Observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: 0.5, // Article must be 50% visible
      rootMargin: '0px'
    })

    // Observe all article elements
    articleRefs.current.forEach((element) => {
      if (observerRef.current) {
        observerRef.current.observe(element)
      }
    })

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [articles, handleIntersection])

  // Ref callback to track article elements
  const setArticleRef = useCallback((articleId: string) => (el: HTMLElement | null) => {
    if (el) {
      articleRefs.current.set(articleId, el)
      if (observerRef.current) {
        observerRef.current.observe(el)
      }
    } else {
      articleRefs.current.delete(articleId)
    }
  }, [])

  // Toggle article expansion
  const toggleExpand = (articleId: string) => {
    setExpandedArticles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(articleId)) {
        newSet.delete(articleId)
      } else {
        newSet.add(articleId)
      }
      return newSet
    })
  }

  // Truncate text to specified length
  const truncateText = (text: string, maxLength: number = 150): string => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength).trim() + '...'
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-neutral-500">
        Loading articles...
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        No articles yet. Sync RSS feeds to get started!
      </div>
    )
  }

  // Compact mode rendering
  if (compact) {
    return (
      <div className="space-y-2">
        {articles.map((article) => (
          <article
            key={article.id}
            ref={setArticleRef(article.id)}
            data-article-id={article.id}
            className="p-2.5 rounded-lg bg-neutral-800/30 hover:bg-neutral-700/40
                     border border-neutral-700/30 hover:border-ember-500/30
                     transition-all duration-200 group cursor-pointer"
            onClick={() => {
              trackActivity(article.id, 'read')
              trackAnalytics(article.id, 'read')
              window.open(article.url, '_blank')
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex-1 text-sm font-medium text-neutral-100 group-hover:text-ember-400 transition-colors line-clamp-1">
                {article.title}
              </h3>
              <div className="flex-shrink-0 text-xs font-bold text-ember-500 bg-ember-500/10 rounded px-1.5 py-0.5">
                {article.score}
              </div>
            </div>
          </article>
        ))}
      </div>
    )
  }

  // Full mode rendering
  return (
    <div className="space-y-3">
      {articles.map((article) => {
        return (
          <article
            key={article.id}
            ref={setArticleRef(article.id)}
            data-article-id={article.id}
            onClick={() => {
              trackActivity(article.id, 'read')
              trackAnalytics(article.id, 'read')
              window.open(article.url, '_blank')
            }}
            className="glass-light rounded-xl p-4 hover:glass-medium transition-all duration-200 group cursor-pointer"
          >
            {/* Header - Title and Score */}
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-neutral-50 group-hover:text-ember-400 transition-colors mb-1.5">
                  {article.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span className="text-ember-500 font-medium">{article.source}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(article.publishedAt)}</span>
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col items-center bg-ember-500/10 rounded-lg px-3 py-2">
                <div className="text-lg font-bold text-ember-500">{article.score}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  trackActivity(article.id, 'upvote')
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                👍
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  trackActivity(article.id, 'downvote')
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                👎
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleSave(article.id)
                }}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  savedArticles.has(article.id)
                    ? 'bg-ember-500/20 hover:bg-ember-500/30 text-ember-400'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                }`}
              >
                {savedArticles.has(article.id) ? '📌' : '🔖'}
              </button>
            </div>
          </article>
        )
      })}

      {/* Pagination - only show when not using provided articles and pagination is enabled */}
      {showPagination && !providedArticles && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          disabled={loading}
        />
      )}
    </div>
  )
}
