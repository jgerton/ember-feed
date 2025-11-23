'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Article {
  id: string
  title: string
  source: string
  url: string
  description: string
  publishedAt: string
  score: number
  topics?: Array<{
    topic: {
      name: string
      slug: string
    }
  }>
  recommendation: {
    score: number
    reason: string
    breakdown: {
      similarityScore: number
      topicAffinityScore: number
      sourceAffinityScore: number
      serendipityBonus: number
      recencyBonus: number
    }
  }
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

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(20)
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchRecommendations()
  }, [limit])

  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/recommendations?limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch recommendations')
      const data = await res.json()
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Error fetching recommendations:', error)
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
    } catch (error) {
      console.error('Error tracking activity:', error)
    }
  }

  const handleSaveArticle = async (articleId: string) => {
    try {
      await fetch('/api/saved-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId })
      })
      await trackActivity(articleId, 'save')
      // Refresh recommendations after saving
      fetchRecommendations()
    } catch (error) {
      console.error('Error saving article:', error)
    }
  }

  const toggleBreakdown = (articleId: string) => {
    const newExpanded = new Set(expandedBreakdowns)
    if (newExpanded.has(articleId)) {
      newExpanded.delete(articleId)
    } else {
      newExpanded.add(articleId)
    }
    setExpandedBreakdowns(newExpanded)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-neutral-400'
  }

  if (loading) {
    return (
      <main className="min-h-screen glass-background p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-700 rounded w-1/3"></div>
            <div className="h-64 bg-neutral-700 rounded"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen glass-background p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Link
                href="/"
                className="text-ember-500 hover:text-ember-400 transition-colors text-sm mb-2 inline-block"
              >
                ← Back to Feed
              </Link>
              <h1 className="text-4xl font-bold text-ember-500">
                Recommended for You
              </h1>
              <p className="text-neutral-400 mt-2">
                Personalized articles based on your reading history and preferences
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="glass-light rounded-xl p-4 flex items-center justify-between">
            <div className="text-neutral-300">
              <span className="font-semibold text-ember-400">{recommendations.length}</span> recommendations found
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLimit(10)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  limit === 10
                    ? 'bg-ember-500 text-neutral-50'
                    : 'glass-medium text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Top 10
              </button>
              <button
                onClick={() => setLimit(20)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  limit === 20
                    ? 'bg-ember-500 text-neutral-50'
                    : 'glass-medium text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Top 20
              </button>
              <button
                onClick={() => setLimit(50)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  limit === 50
                    ? 'bg-ember-500 text-neutral-50'
                    : 'glass-medium text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Top 50
              </button>
            </div>
          </div>
        </header>

        {/* Recommendations List */}
        {recommendations.length === 0 ? (
          <div className="glass-light rounded-2xl p-12 text-center">
            <p className="text-neutral-400 text-lg mb-4">
              No recommendations available yet
            </p>
            <p className="text-neutral-500 text-sm">
              Start reading articles to get personalized recommendations
            </p>
            <Link
              href="/"
              className="inline-block mt-6 px-6 py-3 bg-ember-500 hover:bg-ember-400 text-neutral-50 rounded-lg transition-colors"
            >
              Browse Articles
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((article, index) => (
              <article
                key={article.id}
                className="glass-medium rounded-xl p-6 hover:glass-light transition-all group"
              >
                {/* Rank & Recommendation Score */}
                <div className="flex items-start gap-4 mb-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-ember-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl font-bold text-ember-400">#{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-2xl font-bold ${getScoreColor(article.recommendation.score)}`}>
                        {Math.round(article.recommendation.score)}
                      </span>
                      <span className="text-sm text-neutral-400">recommendation score</span>
                    </div>
                    <p className="text-sm text-ember-400 italic">
                      {article.recommendation.reason}
                    </p>
                  </div>
                </div>

                {/* Article Info */}
                <div className="mb-3">
                  <h2 className="text-xl font-semibold text-neutral-50 mb-2 group-hover:text-ember-400 transition-colors">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackActivity(article.id, 'read')}
                      className="hover:underline"
                    >
                      {article.title}
                    </a>
                  </h2>
                  <p className="text-sm text-neutral-400 line-clamp-2">
                    {article.description}
                  </p>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mb-3">
                  <span className="text-ember-500">{article.source}</span>
                  <span>•</span>
                  <span>Score: {article.score}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(article.publishedAt)}</span>
                  {article.topics && article.topics.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-ember-400">{article.topics[0].topic.name}</span>
                    </>
                  )}
                </div>

                {/* Recommendation Breakdown */}
                <div className="border-t border-neutral-700 pt-3">
                  <button
                    onClick={() => toggleBreakdown(article.id)}
                    className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-2"
                  >
                    <span>View scoring breakdown</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        expandedBreakdowns.has(article.id) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedBreakdowns.has(article.id) && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="glass-light rounded-lg p-3">
                        <div className="text-xs text-neutral-500 mb-1">Similarity</div>
                        <div className="text-lg font-semibold text-blue-400">
                          {Math.round(article.recommendation.breakdown.similarityScore)}
                        </div>
                      </div>
                      <div className="glass-light rounded-lg p-3">
                        <div className="text-xs text-neutral-500 mb-1">Topic Match</div>
                        <div className="text-lg font-semibold text-purple-400">
                          {Math.round(article.recommendation.breakdown.topicAffinityScore)}
                        </div>
                      </div>
                      <div className="glass-light rounded-lg p-3">
                        <div className="text-xs text-neutral-500 mb-1">Source Pref</div>
                        <div className="text-lg font-semibold text-green-400">
                          {Math.round(article.recommendation.breakdown.sourceAffinityScore)}
                        </div>
                      </div>
                      <div className="glass-light rounded-lg p-3">
                        <div className="text-xs text-neutral-500 mb-1">Discovery</div>
                        <div className="text-lg font-semibold text-yellow-400">
                          {Math.round(article.recommendation.breakdown.serendipityBonus)}
                        </div>
                      </div>
                      <div className="glass-light rounded-lg p-3">
                        <div className="text-xs text-neutral-500 mb-1">Recency</div>
                        <div className="text-lg font-semibold text-orange-400">
                          {Math.round(article.recommendation.breakdown.recencyBonus)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackActivity(article.id, 'read')}
                    className="flex-1 px-4 py-2 bg-ember-500 hover:bg-ember-400 text-neutral-50 rounded-lg transition-colors text-center text-sm font-medium"
                  >
                    Read Article
                  </a>
                  <button
                    onClick={() => handleSaveArticle(article.id)}
                    className="px-4 py-2 glass-medium hover:glass-light text-neutral-300 hover:text-ember-400 rounded-lg transition-all text-sm"
                  >
                    Save for Later
                  </button>
                  <button
                    onClick={() => trackActivity(article.id, 'upvote')}
                    className="px-4 py-2 glass-medium hover:glass-light text-neutral-300 hover:text-green-400 rounded-lg transition-all"
                  >
                    👍
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        {recommendations.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={fetchRecommendations}
              className="px-6 py-3 glass-medium hover:glass-light text-neutral-300 hover:text-ember-400 rounded-lg transition-all"
            >
              Refresh Recommendations
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
