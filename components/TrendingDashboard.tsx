'use client'

import { useState, useEffect } from 'react'

type HotTimeframe = '24hr' | '3day' | '7day'
type TrendingTimeframe = '7day' | '14day' | '30day'

interface HotTopic {
  rank: number
  keyword: string
  score?: number
  mentions: number
  summary?: string
  sources: string[]
  sample_articles?: Array<{
    title: string
    url: string
    source: string
  }>
}

interface TrendingUpTopic {
  rank: number
  keyword: string
  velocity: number
  current_volume: number
  previous_volume: number
  percent_growth: number
  summary?: string
  sources: string[]
  sample_articles?: Array<{
    title: string
    url: string
    source: string
  }>
}

interface DashboardProps {
  onTopicClick?: (topic: string) => void
}

/**
 * Trending Topics Dashboard
 *
 * Unified view showing Hot Now and Trending Up topics with
 * visual indicators for momentum and engagement.
 */
export default function TrendingDashboard({ onTopicClick }: DashboardProps) {
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([])
  const [trendingTopics, setTrendingTopics] = useState<TrendingUpTopic[]>([])
  const [hotTimeframe, setHotTimeframe] = useState<HotTimeframe>('24hr')
  const [trendingTimeframe, setTrendingTimeframe] = useState<TrendingTimeframe>('7day')
  const [loadingHot, setLoadingHot] = useState(true)
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [activeView, setActiveView] = useState<'split' | 'hot' | 'trending'>('split')

  useEffect(() => {
    fetchHotTopics()
  }, [hotTimeframe])

  useEffect(() => {
    fetchTrendingTopics()
  }, [trendingTimeframe])

  const fetchHotTopics = async () => {
    setLoadingHot(true)
    try {
      const res = await fetch(`/api/trending/hot?timeframe=${hotTimeframe}&limit=8`)
      if (res.ok) {
        const data = await res.json()
        setHotTopics(data.topics || [])
      }
    } catch (error) {
      console.error('Failed to fetch hot topics:', error)
    } finally {
      setLoadingHot(false)
    }
  }

  const fetchTrendingTopics = async () => {
    setLoadingTrending(true)
    try {
      const res = await fetch(`/api/trending/trending-up?timeframe=${trendingTimeframe}&limit=8`)
      if (res.ok) {
        const data = await res.json()
        setTrendingTopics(data.topics || [])
      }
    } catch (error) {
      console.error('Failed to fetch trending topics:', error)
    } finally {
      setLoadingTrending(false)
    }
  }

  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? '+' : ''
    return `${sign}${growth.toFixed(0)}%`
  }

  const getVelocityColor = (velocity: number) => {
    if (velocity >= 2) return 'text-green-400 bg-green-500/20'
    if (velocity >= 1) return 'text-emerald-400 bg-emerald-500/20'
    return 'text-neutral-400 bg-neutral-500/20'
  }

  const getMentionsBadge = (mentions: number) => {
    if (mentions >= 50) return 'bg-ember-500/30 text-ember-300'
    if (mentions >= 20) return 'bg-amber-500/20 text-amber-400'
    return 'bg-neutral-700/50 text-neutral-300'
  }

  const TimeframeTabs = ({
    timeframes,
    active,
    onChange
  }: {
    timeframes: string[]
    active: string
    onChange: (t: any) => void
  }) => (
    <div className="flex gap-1 bg-neutral-800/30 p-1 rounded-lg">
      {timeframes.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={`px-3 py-1 text-xs rounded-md transition-all ${
            active === tf
              ? 'bg-ember-500 text-white font-medium'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  )

  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-20 bg-neutral-800/30 rounded-lg animate-pulse" />
      ))}
    </div>
  )

  const HotTopicCard = ({ topic, index }: { topic: HotTopic; index: number }) => (
    <div
      onClick={() => onTopicClick?.(topic.keyword)}
      className="p-4 rounded-xl bg-neutral-800/30 border border-neutral-700/30
               hover:bg-neutral-700/40 hover:border-ember-500/30
               transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-ember-500/50">#{topic.rank}</span>
          <div>
            <h4 className="font-semibold text-neutral-100 group-hover:text-ember-400 transition-colors">
              {topic.keyword}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs rounded-full ${getMentionsBadge(topic.mentions)}`}>
                {topic.mentions} mentions
              </span>
              {topic.sources.length > 0 && (
                <span className="text-xs text-neutral-500">
                  {topic.sources.slice(0, 2).join(', ')}
                  {topic.sources.length > 2 && ` +${topic.sources.length - 2}`}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-ember-500/20 to-amber-500/20 flex items-center justify-center">
            <span className="text-2xl">
              {index < 3 ? '🔥' : index < 5 ? '🌡️' : '📈'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  const TrendingTopicCard = ({ topic }: { topic: TrendingUpTopic }) => (
    <div
      onClick={() => onTopicClick?.(topic.keyword)}
      className="p-4 rounded-xl bg-neutral-800/30 border border-neutral-700/30
               hover:bg-neutral-700/40 hover:border-emerald-500/30
               transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-emerald-500/50">#{topic.rank}</span>
          <div>
            <h4 className="font-semibold text-neutral-100 group-hover:text-emerald-400 transition-colors">
              {topic.keyword}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getVelocityColor(topic.velocity)}`}>
                {topic.velocity.toFixed(1)}x velocity
              </span>
              <span className="text-xs text-neutral-500">
                {topic.previous_volume} → {topic.current_volume}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${topic.percent_growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatGrowth(topic.percent_growth)}
          </div>
          <div className="text-xs text-neutral-500">growth</div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-neutral-100">Trending Dashboard</h2>
        <div className="flex gap-1 bg-neutral-800/30 p-1 rounded-lg">
          {(['split', 'hot', 'trending'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all capitalize ${
                activeView === view
                  ? 'bg-neutral-700 text-white font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {view === 'split' ? 'Both' : view === 'hot' ? 'Hot Now' : 'Trending Up'}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className={`grid gap-6 ${activeView === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Hot Now Section */}
        {(activeView === 'split' || activeView === 'hot') && (
          <div className="glass-medium rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <h3 className="text-lg font-semibold text-ember-400">Hot Now</h3>
              </div>
              <TimeframeTabs
                timeframes={['24hr', '3day', '7day']}
                active={hotTimeframe}
                onChange={setHotTimeframe}
              />
            </div>

            {loadingHot ? (
              <LoadingSkeleton />
            ) : hotTopics.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                No hot topics found
              </div>
            ) : (
              <div className="space-y-3">
                {hotTopics.map((topic, index) => (
                  <HotTopicCard key={topic.keyword} topic={topic} index={index} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trending Up Section */}
        {(activeView === 'split' || activeView === 'trending') && (
          <div className="glass-medium rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📈</span>
                <h3 className="text-lg font-semibold text-emerald-400">Trending Up</h3>
              </div>
              <TimeframeTabs
                timeframes={['7day', '14day', '30day']}
                active={trendingTimeframe}
                onChange={setTrendingTimeframe}
              />
            </div>

            {loadingTrending ? (
              <LoadingSkeleton />
            ) : trendingTopics.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                No trending topics found
              </div>
            ) : (
              <div className="space-y-3">
                {trendingTopics.map((topic) => (
                  <TrendingTopicCard key={topic.keyword} topic={topic} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-neutral-800/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-ember-400">{hotTopics.length}</div>
          <div className="text-xs text-neutral-400 mt-1">Hot Topics</div>
        </div>
        <div className="bg-neutral-800/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{trendingTopics.length}</div>
          <div className="text-xs text-neutral-400 mt-1">Trending Up</div>
        </div>
        <div className="bg-neutral-800/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">
            {hotTopics.reduce((sum, t) => sum + t.mentions, 0)}
          </div>
          <div className="text-xs text-neutral-400 mt-1">Total Mentions</div>
        </div>
        <div className="bg-neutral-800/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {new Set([...hotTopics.flatMap(t => t.sources), ...trendingTopics.flatMap(t => t.sources)]).size}
          </div>
          <div className="text-xs text-neutral-400 mt-1">Active Sources</div>
        </div>
      </div>
    </div>
  )
}
