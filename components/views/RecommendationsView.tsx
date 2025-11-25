'use client'

import { useState, useEffect } from 'react'
import NewsWidget from '@/components/NewsWidget'
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
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  useEffect(() => {
    fetchRecommendations()
  }, [currentPage])

  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/recommendations?limit=${limit}&page=${currentPage}`)
      if (!res.ok) throw new Error('Failed to fetch recommendations')
      const data = await res.json()

      // Transform recommendations to match Article interface
      const articles = (data.recommendations || []).map((rec: any) => ({
        ...rec,
        createdAt: rec.createdAt || rec.publishedAt
      }))

      setRecommendations(articles)
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1)
        setTotal(data.pagination.total || 0)
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-neutral-300">
          <span className="font-semibold text-ember-400">{total}</span> personalized recommendations
        </div>
      </div>

      {/* Use NewsWidget for consistent styling (disable its pagination since we handle it) */}
      <NewsWidget
        articles={recommendations}
        compact={false}
        showPagination={false}
      />

      {/* Pagination */}
      {totalPages > 1 && (
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
