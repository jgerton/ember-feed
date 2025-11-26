'use client'

import { useState, useEffect, useMemo } from 'react'
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

type SortOption = 'score' | 'similarity' | 'topic' | 'source' | 'discovery' | 'recency'
type FilterOption = 'all' | 'similar' | 'topic-match' | 'new-source' | 'fresh'

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Progress bar component for visual score display
function ScoreBar({ value, maxValue, color, label }: { value: number; maxValue: number; color: string; label: string }) {
  const percentage = Math.min((value / maxValue) * 100, 100)
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-neutral-400 truncate">{label}</span>
        <span className={color}>{Math.round(value)}</span>
      </div>
      <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color.replace('text-', 'bg-')}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Circular score indicator
function CircularScore({ score }: { score: number }) {
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : '#a3a3a3'

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="#404040"
          strokeWidth="4"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-lg font-bold text-neutral-50">
        {Math.round(score)}
      </span>
    </div>
  )
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(20)
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<SortOption>('score')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')

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

  // Filter and sort recommendations
  const filteredAndSortedRecommendations = useMemo(() => {
    let filtered = [...recommendations]

    // Apply filter
    switch (filterBy) {
      case 'similar':
        filtered = filtered.filter(r => r.recommendation.breakdown.similarityScore >= 30)
        break
      case 'topic-match':
        filtered = filtered.filter(r => r.recommendation.breakdown.topicAffinityScore >= 15)
        break
      case 'new-source':
        filtered = filtered.filter(r => r.recommendation.breakdown.serendipityBonus >= 10)
        break
      case 'fresh':
        filtered = filtered.filter(r => r.recommendation.breakdown.recencyBonus >= 10)
        break
    }

    // Apply sort
    switch (sortBy) {
      case 'similarity':
        filtered.sort((a, b) => b.recommendation.breakdown.similarityScore - a.recommendation.breakdown.similarityScore)
        break
      case 'topic':
        filtered.sort((a, b) => b.recommendation.breakdown.topicAffinityScore - a.recommendation.breakdown.topicAffinityScore)
        break
      case 'source':
        filtered.sort((a, b) => b.recommendation.breakdown.sourceAffinityScore - a.recommendation.breakdown.sourceAffinityScore)
        break
      case 'discovery':
        filtered.sort((a, b) => b.recommendation.breakdown.serendipityBonus - a.recommendation.breakdown.serendipityBonus)
        break
      case 'recency':
        filtered.sort((a, b) => b.recommendation.breakdown.recencyBonus - a.recommendation.breakdown.recencyBonus)
        break
      default:
        filtered.sort((a, b) => b.recommendation.score - a.recommendation.score)
    }

    return filtered
  }, [recommendations, sortBy, filterBy])

  // Get dominant reason for an article
  const getDominantReason = (breakdown: Article['recommendation']['breakdown']) => {
    const scores = [
      { key: 'similarity', value: breakdown.similarityScore, label: 'Similar Content' },
      { key: 'topic', value: breakdown.topicAffinityScore, label: 'Topic Match' },
      { key: 'source', value: breakdown.sourceAffinityScore, label: 'Preferred Source' },
      { key: 'discovery', value: breakdown.serendipityBonus, label: 'Discovery' },
      { key: 'recency', value: breakdown.recencyBonus, label: 'Fresh Content' },
    ]
    return scores.reduce((max, curr) => curr.value > max.value ? curr : max)
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

          {/* Controls Bar */}
          <div className="glass-light rounded-xl p-4 space-y-4">
            {/* Top row: Stats and Limit */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-neutral-300">
                <span className="font-semibold text-ember-400">{filteredAndSortedRecommendations.length}</span>
                {filterBy !== 'all' && <span className="text-neutral-500"> of {recommendations.length}</span>}
                {' '}recommendations
              </div>
              <div className="flex gap-2">
                {[10, 20, 50].map((n) => (
                  <button
                    key={n}
                    onClick={() => setLimit(n)}
                    className={`px-3 py-1.5 rounded-lg transition-all text-sm ${
                      limit === n
                        ? 'bg-ember-500 text-neutral-50'
                        : 'glass-medium text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Top {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter and Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Filter */}
              <div className="flex-1">
                <label className="text-xs text-neutral-500 mb-1 block">Filter by</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All', icon: '📋' },
                    { value: 'similar', label: 'Similar', icon: '🔗' },
                    { value: 'topic-match', label: 'Topic', icon: '🏷️' },
                    { value: 'new-source', label: 'Discovery', icon: '✨' },
                    { value: 'fresh', label: 'Fresh', icon: '🕐' },
                  ].map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFilterBy(f.value as FilterOption)}
                      className={`px-3 py-1.5 rounded-lg transition-all text-sm flex items-center gap-1.5 ${
                        filterBy === f.value
                          ? 'bg-ember-500/20 text-ember-400 ring-1 ring-ember-500/50'
                          : 'glass-medium text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <span>{f.icon}</span>
                      <span className="hidden sm:inline">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div className="sm:w-48">
                <label className="text-xs text-neutral-500 mb-1 block">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 rounded-lg glass-medium text-neutral-200 text-sm border-none focus:ring-2 focus:ring-ember-500/50 bg-neutral-800/50"
                >
                  <option value="score">Overall Score</option>
                  <option value="similarity">Similarity</option>
                  <option value="topic">Topic Match</option>
                  <option value="source">Source Preference</option>
                  <option value="discovery">Discovery Bonus</option>
                  <option value="recency">Recency</option>
                </select>
              </div>
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
            {filteredAndSortedRecommendations.map((article, index) => {
              const dominantReason = getDominantReason(article.recommendation.breakdown)
              return (
                <article
                  key={article.id}
                  className="glass-medium rounded-xl p-4 sm:p-6 hover:glass-light transition-all group"
                >
                  {/* Header: Rank, Score Circle, Title */}
                  <div className="flex items-start gap-3 sm:gap-4 mb-4">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-ember-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-lg sm:text-xl font-bold text-ember-400">#{index + 1}</span>
                    </div>

                    {/* Circular Score */}
                    <div className="flex-shrink-0">
                      <CircularScore score={article.recommendation.score} />
                    </div>

                    {/* Title & Reason */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl font-semibold text-neutral-50 mb-1 group-hover:text-ember-400 transition-colors line-clamp-2">
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
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-ember-500/20 text-ember-400">
                          {dominantReason.label}
                        </span>
                        <span className="text-neutral-500">{article.source}</span>
                        <span className="text-neutral-600">•</span>
                        <span className="text-neutral-500">{formatTimeAgo(article.publishedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-neutral-400 line-clamp-2 mb-4 ml-0 sm:ml-[4.5rem]">
                    {article.description}
                  </p>

                  {/* Mini Score Bars (always visible on desktop, collapsible on mobile) */}
                  <div className="mb-4 ml-0 sm:ml-[4.5rem]">
                    <button
                      onClick={() => toggleBreakdown(article.id)}
                      className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1 mb-2 sm:hidden"
                    >
                      <span>{expandedBreakdowns.has(article.id) ? 'Hide' : 'Show'} breakdown</span>
                      <svg
                        className={`w-3 h-3 transition-transform ${expandedBreakdowns.has(article.id) ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <div className={`grid grid-cols-1 sm:grid-cols-5 gap-3 ${
                      expandedBreakdowns.has(article.id) ? 'block' : 'hidden sm:grid'
                    }`}>
                      <ScoreBar
                        value={article.recommendation.breakdown.similarityScore}
                        maxValue={100}
                        color="text-blue-400"
                        label="Similarity"
                      />
                      <ScoreBar
                        value={article.recommendation.breakdown.topicAffinityScore}
                        maxValue={40}
                        color="text-purple-400"
                        label="Topic"
                      />
                      <ScoreBar
                        value={article.recommendation.breakdown.sourceAffinityScore}
                        maxValue={15}
                        color="text-green-400"
                        label="Source"
                      />
                      <ScoreBar
                        value={article.recommendation.breakdown.serendipityBonus}
                        maxValue={20}
                        color="text-yellow-400"
                        label="Discovery"
                      />
                      <ScoreBar
                        value={article.recommendation.breakdown.recencyBonus}
                        maxValue={15}
                        color="text-orange-400"
                        label="Recency"
                      />
                    </div>
                  </div>

                  {/* Topics */}
                  {article.topics && article.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4 ml-0 sm:ml-[4.5rem]">
                      {article.topics.slice(0, 3).map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs rounded-full glass-light text-neutral-400"
                        >
                          {t.topic.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 ml-0 sm:ml-[4.5rem]">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackActivity(article.id, 'read')}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-ember-500 hover:bg-ember-400 text-neutral-50 rounded-lg transition-colors text-center text-sm font-medium min-w-[120px]"
                    >
                      Read Article
                    </a>
                    <button
                      onClick={() => handleSaveArticle(article.id)}
                      className="px-4 py-2.5 glass-medium hover:glass-light text-neutral-300 hover:text-ember-400 rounded-lg transition-all text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => trackActivity(article.id, 'upvote')}
                      className="px-4 py-2.5 glass-medium hover:glass-light text-neutral-300 hover:text-green-400 rounded-lg transition-all text-sm"
                      title="Like this recommendation"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => trackActivity(article.id, 'downvote')}
                      className="px-4 py-2.5 glass-medium hover:glass-light text-neutral-300 hover:text-red-400 rounded-lg transition-all text-sm"
                      title="Not interested"
                    >
                      👎
                    </button>
                  </div>
                </article>
              )
            })}
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
