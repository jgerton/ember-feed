'use client'

import { useState, useEffect } from 'react'

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

export default function NewsWidget() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/articles?limit=10')
      if (!res.ok) throw new Error('Failed to fetch articles')
      const data = await res.json()
      setArticles(data)
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
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

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <article
          key={article.id}
          className="glass-light rounded-xl p-5 hover:glass-medium transition-all duration-200 cursor-pointer group"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-neutral-50 group-hover:text-ember-400 transition-colors mb-1">
                {article.title}
              </h3>
              <div className="flex items-center gap-3 text-sm text-neutral-400">
                <span className="text-ember-500 font-medium">{article.source}</span>
                <span>•</span>
                <span>{formatTimeAgo(article.publishedAt)}</span>
              </div>
            </div>
            <div className="flex flex-col items-center ml-4">
              <div className="text-2xl font-bold text-ember-500">{article.score}</div>
              <div className="text-xs text-neutral-500">score</div>
            </div>
          </div>

          {/* Summary */}
          <p className="text-neutral-300 text-sm leading-relaxed mb-4">
            {article.description}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackActivity(article.id, 'read')}
              className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              Read More
            </a>
            <button
              onClick={() => trackActivity(article.id, 'upvote')}
              className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              👍 Upvote
            </button>
            <button
              onClick={() => trackActivity(article.id, 'downvote')}
              className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              👎 Downvote
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
