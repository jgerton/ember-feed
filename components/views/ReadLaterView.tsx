'use client'

import { useState, useEffect } from 'react'

interface Topic {
  name: string
  slug: string
}

interface ArticleTopic {
  topic: Topic
  relevance: number
}

interface Article {
  id: string
  title: string
  source: string
  url: string
  description: string
  publishedAt: string
  score: number
  topics?: ArticleTopic[]
}

interface SavedArticle {
  id: string
  articleId: string
  priority: number
  isRead: boolean
  notes: string | null
  savedAt: string
  readAt: string | null
  article: Article
}

/**
 * Embedded Read Later View - Compact version for the main content area
 */
export default function ReadLaterView() {
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSavedArticles()
  }, [])

  const fetchSavedArticles = async () => {
    try {
      const res = await fetch('/api/saved-articles')
      if (!res.ok) throw new Error('Failed to fetch saved articles')
      const data = await res.json()
      setSavedArticles(data)
    } catch (error) {
      console.error('Error fetching saved articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeSavedArticle = async (id: string) => {
    if (!confirm('Remove this article?')) return

    try {
      const res = await fetch(`/api/saved-articles/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete article')
      setSavedArticles(prev => prev.filter(sa => sa.id !== id))
    } catch (error) {
      console.error('Error deleting saved article:', error)
    }
  }

  const toggleReadStatus = async (savedArticle: SavedArticle) => {
    try {
      const res = await fetch(`/api/saved-articles/${savedArticle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: !savedArticle.isRead })
      })

      if (!res.ok) throw new Error('Failed to update article')

      const updated = await res.json()
      setSavedArticles(prev =>
        prev.map(sa => (sa.id === savedArticle.id ? updated : sa))
      )
    } catch (error) {
      console.error('Error updating saved article:', error)
    }
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const getPriorityLabel = (priority: number): string => {
    const labels = { 5: 'Urgent', 4: 'High', 3: 'Medium', 2: 'Low', 1: 'Very Low' }
    return labels[priority as keyof typeof labels] || 'Medium'
  }

  const getPriorityColor = (priority: number): string => {
    const colors = {
      5: 'text-red-400 bg-red-500/20 border-red-800/50',
      4: 'text-orange-400 bg-orange-500/20 border-orange-800/50',
      3: 'text-ember-400 bg-ember-500/20 border-ember-800/50',
      2: 'text-yellow-400 bg-yellow-500/20 border-yellow-800/50',
      1: 'text-neutral-400 bg-neutral-500/20 border-neutral-700/50'
    }
    return colors[priority as keyof typeof colors] || colors[3]
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-neutral-800/30 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  const unreadCount = savedArticles.filter(sa => !sa.isRead).length
  const readCount = savedArticles.filter(sa => sa.isRead).length

  if (savedArticles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🔖</div>
        <h2 className="text-xl font-semibold text-neutral-300 mb-2">
          No saved articles yet
        </h2>
        <p className="text-neutral-500">
          Click "Save for Later" on any article to add it to your reading queue.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-neutral-400 mb-6">
        <span className="text-ember-400 font-semibold">{unreadCount} unread</span>
        <span>•</span>
        <span>{readCount} read</span>
        <span>•</span>
        <span>{savedArticles.length} total</span>
      </div>

      {/* Saved Articles List */}
      <div className="space-y-3">
        {savedArticles.map((savedArticle) => {
          const article = savedArticle.article

          return (
            <article
              key={savedArticle.id}
              onClick={() => window.open(article.url, '_blank')}
              className={`bg-neutral-800/30 rounded-xl p-3 hover:bg-neutral-700/40
                       border border-neutral-700/30 hover:border-ember-500/30
                       transition-all group cursor-pointer ${savedArticle.isRead ? 'opacity-60' : ''}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {/* Priority Badge */}
                    <span className={`px-1.5 py-0.5 text-xs rounded-md border ${getPriorityColor(savedArticle.priority)}`}>
                      {getPriorityLabel(savedArticle.priority)}
                    </span>

                    {/* Read Status Badge */}
                    {savedArticle.isRead && (
                      <span className="px-1.5 py-0.5 text-xs rounded-md bg-green-500/20 text-green-400 border border-green-800/50">
                        ✓
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-neutral-50 mb-1 line-clamp-2 group-hover:text-ember-400 transition-colors">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <span className="text-ember-500 font-medium">{article.source}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(article.publishedAt)}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-center bg-ember-500/10 rounded px-2 py-1">
                  <div className="text-sm font-bold text-ember-500">{article.score}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleReadStatus(savedArticle)
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                >
                  {savedArticle.isRead ? 'Unread' : 'Read'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeSavedArticle(savedArticle.id)
                  }}
                  className="px-2 py-1.5 text-xs rounded-lg bg-red-900/20 hover:bg-red-900/30 text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
