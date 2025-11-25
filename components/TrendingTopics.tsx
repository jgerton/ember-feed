'use client'

import { useEffect, useState } from 'react'

interface Topic {
  topic: string
  count: number
  trend: 'up' | 'down' | 'stable'
  sources?: string[]
}

interface TrendingTopicsProps {
  onTopicClick?: (topic: string) => void
}

/**
 * Trending Topics Widget
 *
 * Displays trending topics from the aggregator service
 * with trend indicators and article counts.
 */
export default function TrendingTopics({ onTopicClick }: TrendingTopicsProps = {}) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    async function fetchTopics() {
      try {
        // Fetch from the trending aggregator API
        const response = await fetch('/api/trending/hot?timeframe=24hr&limit=6')
        if (response.ok) {
          const data = await response.json()
          // Transform API response to component format
          const topicsWithTrend = (data.topics || []).map((topic: any, index: number) => ({
            topic: topic.keyword,
            count: topic.mentions || 0,
            sources: topic.sources || [],
            // Trend based on rank (top items trending up)
            trend: index < 2 ? 'up' : index < 4 ? 'stable' : 'down'
          }))
          setTopics(topicsWithTrend)
        }
      } catch (error) {
        console.error('Failed to fetch trending topics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTopics()
  }, [])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '↗️'
      case 'down':
        return '↘️'
      default:
        return '→'
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-400'
      case 'down':
        return 'text-red-400'
      default:
        return 'text-neutral-400'
    }
  }

  if (loading) {
    return (
      <div className="glass-medium rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-neutral-50">Trending Topics</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-neutral-800/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const hasTopics = topics.length > 0

  return (
    <div className="glass-medium rounded-2xl overflow-hidden">
      {/* Header - Always Visible */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:text-ember-400 transition-colors flex-1"
        >
          <h2 className="text-base font-bold text-neutral-50">Trending Topics</h2>
          <svg
            className={`w-4 h-4 text-neutral-500 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* View All Link - Always Visible */}
        {hasTopics && (
          <button
            onClick={() => onTopicClick?.('all')}
            className="text-xs text-neutral-400 hover:text-ember-400 transition-colors whitespace-nowrap"
          >
            View all →
          </button>
        )}
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          {!hasTopics ? (
            <p className="text-neutral-400 text-sm">No trending topics yet</p>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent hover:scrollbar-thumb-neutral-600">
              {topics.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => onTopicClick?.(topic.topic)}
                  className="w-full flex items-center justify-between p-3 rounded-lg
                           bg-neutral-800/30 hover:bg-neutral-700/40
                           border border-neutral-700/30 hover:border-ember-500/30
                           transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-neutral-100 truncate group-hover:text-ember-400 transition-colors">
                      {topic.topic}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {topic.count} {topic.count === 1 ? 'article' : 'articles'}
                    </p>
                  </div>
                  <span className={`text-xl ml-3 ${getTrendColor(topic.trend)}`}>
                    {getTrendIcon(topic.trend)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
