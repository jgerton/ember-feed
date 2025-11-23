'use client'

import { useState, useEffect } from 'react'
import NewsWidget from '@/components/NewsWidget'

interface Article {
  id: string
  title: string
  source: string
  url: string
  description: string
  publishedAt: string
  score: number
  createdAt: string
  topics?: Array<{
    topic: {
      name: string
      slug: string
    }
  }>
  recommendation?: {
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

/**
 * Embedded Recommendations View - Uses NewsWidget component for consistency
 */
export default function RecommendationsView() {
  const [recommendations, setRecommendations] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(10)

  useEffect(() => {
    fetchRecommendations()
  }, [limit])

  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/recommendations?limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch recommendations')
      const data = await res.json()

      // Transform recommendations to match Article interface
      const articles = (data.recommendations || []).map((rec: any) => ({
        ...rec,
        createdAt: rec.createdAt || rec.publishedAt
      }))

      setRecommendations(articles)
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoading(false)
    }
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

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-400 text-lg mb-2">No recommendations available yet</p>
        <p className="text-neutral-500 text-sm">Start reading articles to get personalized recommendations</p>
      </div>
    )
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-neutral-300">
          <span className="font-semibold text-ember-400">{recommendations.length}</span> personalized recommendations
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setLimit(10)}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              limit === 10
                ? 'bg-ember-500 text-neutral-50'
                : 'bg-neutral-800/30 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Top 10
          </button>
          <button
            onClick={() => setLimit(20)}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              limit === 20
                ? 'bg-ember-500 text-neutral-50'
                : 'bg-neutral-800/30 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Top 20
          </button>
        </div>
      </div>

      {/* Use NewsWidget for consistent styling */}
      <NewsWidget
        articles={recommendations}
        compact={false}
      />
    </div>
  )
}
