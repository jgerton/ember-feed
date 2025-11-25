'use client'

import { useState, useEffect } from 'react'

type Timeframe = '24hr' | '3day' | '7day'

interface Topic {
  rank: number
  keyword: string
  score: number
  mentions: number
  sources: string[]
  summary: string
  sample_articles: Array<{
    title: string
    url: string
    source: string
  }>
  fetched_at: string
}

interface HotTopicsResponse {
  timeframe: string
  topics: Topic[]
  note?: string
}

export default function HotNowWidget() {
  const [activeTab, setActiveTab] = useState<Timeframe>('24hr')
  const [data, setData] = useState<HotTopicsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHotTopics(activeTab)
  }, [activeTab])

  const fetchHotTopics = async (timeframe: Timeframe) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/trending/hot?timeframe=${timeframe}&limit=5`)

      if (!response.ok) {
        throw new Error('Failed to fetch hot topics')
      }

      const result: HotTopicsResponse = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const tabLabels: Record<Timeframe, string> = {
    '24hr': '24 Hours',
    '3day': '3 Days',
    '7day': '7 Days',
  }

  return (
    <div className="glass-card p-6 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <h2 className="text-2xl font-bold text-ember-500">Hot Now</h2>
        </div>
        <button
          onClick={() => fetchHotTopics(activeTab)}
          className="text-sm text-neutral-400 hover:text-ember-500 transition-colors"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Timeframe Tabs */}
      <div className="flex gap-2 mb-6 bg-neutral-800/30 p-1 rounded-lg">
        {(Object.keys(tabLabels) as Timeframe[]).map((timeframe) => (
          <button
            key={timeframe}
            onClick={() => setActiveTab(timeframe)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === timeframe
                ? 'bg-ember-500 text-white shadow-lg'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            {tabLabels[timeframe]}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && !data ? (
        <div className="text-center py-12 text-neutral-400">
          Loading hot topics...
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">
          Error: {error}
        </div>
      ) : data && data.topics.length > 0 ? (
        <div className="space-y-4">
          {data.topics.map((topic) => (
            <div
              key={topic.rank}
              className="p-4 bg-neutral-800/20 rounded-lg hover:bg-neutral-800/40 transition-all cursor-pointer group"
            >
              {/* Rank and Keyword */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-ember-500/50">
                    #{topic.rank}
                  </span>
                  <h3 className="text-xl font-semibold text-white group-hover:text-ember-500 transition-colors">
                    {topic.keyword}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-sm text-neutral-400">
                    {topic.mentions} mentions
                  </div>
                </div>
              </div>

              {/* Summary */}
              <p className="text-neutral-300 text-sm mb-3 line-clamp-2">
                {topic.summary}
              </p>

              {/* Sources */}
              <div className="flex flex-wrap gap-2">
                {topic.sources.map((source) => (
                  <span
                    key={source}
                    className="px-2 py-1 text-xs rounded-full bg-ember-500/20 text-ember-400"
                  >
                    {source}
                  </span>
                ))}
              </div>

              {/* Sample Articles (expandable on hover) */}
              {topic.sample_articles.length > 0 && (
                <div className="mt-3 pt-3 border-t border-neutral-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-xs text-neutral-400 mb-2">Sample articles:</div>
                  <div className="space-y-1">
                    {topic.sample_articles.map((article, idx) => (
                      <a
                        key={idx}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-ember-400 hover:text-ember-300 hover:underline truncate"
                      >
                        {article.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-neutral-400">
          No hot topics found for this timeframe
        </div>
      )}

      {/* Note */}
      {data?.note && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400">
          ℹ️ {data.note}
        </div>
      )}
    </div>
  )
}
