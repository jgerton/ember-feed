'use client'

import { useState, useEffect } from 'react'

interface AnalyticsSummary {
  period: {
    days: number
    startDate: string
    endDate: string
  }
  articlesReadOverTime: Array<{ date: string; count: number }>
  categoryBreakdown: Array<{ source: string; count: number }>
  readingStreak: number
  topUpvotedArticles: Array<{
    article: {
      id: string
      title: string
      source: string
      url: string
    }
    upvotes: number
  }>
  productivity: {
    completedTodos: number
    logEntriesByType: Record<string, number>
  }
  engagement: {
    totalViews: number
    totalReads: number
    avgReadingTimeSeconds: number
    avgScrollPercentage: number
    readRate: string
  }
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/analytics/summary?days=${period}`)
      if (!res.ok) throw new Error('Failed to fetch analytics')
      const data = await res.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (type: string) => {
    try {
      setExporting(true)
      const res = await fetch(`/api/analytics/export?type=${type}&days=${period}`)
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ember-feed-${type}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting data:', error)
    } finally {
      setExporting(false)
    }
  }

  if (loading || !analytics) {
    return (
      <div className="text-center py-8 text-neutral-500">
        Loading analytics...
      </div>
    )
  }

  const maxReadCount = Math.max(...analytics.articlesReadOverTime.map(d => d.count), 1)
  const totalArticles = analytics.categoryBreakdown.reduce((sum, cat) => sum + cat.count, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-50">Analytics Dashboard</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Viewing last {period} days
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="px-3 py-2 text-sm rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>

          <div className="relative group">
            <button
              disabled={exporting}
              className="px-3 py-2 text-sm rounded-lg bg-ember-600 hover:bg-ember-700 text-white transition-colors disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-48 glass-light rounded-lg overflow-hidden z-10">
              <button
                onClick={() => exportData('activities')}
                className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700"
              >
                Activities
              </button>
              <button
                onClick={() => exportData('articles')}
                className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700"
              >
                Articles
              </button>
              <button
                onClick={() => exportData('todos')}
                className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700"
              >
                Todos
              </button>
              <button
                onClick={() => exportData('logs')}
                className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700"
              >
                Logs
              </button>
              <button
                onClick={() => exportData('summary')}
                className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700"
              >
                Summary
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-light rounded-xl p-4">
          <div className="text-3xl font-bold text-ember-500">{analytics.readingStreak}</div>
          <div className="text-sm text-neutral-400 mt-1">Day Streak</div>
        </div>
        <div className="glass-light rounded-xl p-4">
          <div className="text-3xl font-bold text-ember-500">{analytics.engagement.totalReads}</div>
          <div className="text-sm text-neutral-400 mt-1">Articles Read</div>
        </div>
        <div className="glass-light rounded-xl p-4">
          <div className="text-3xl font-bold text-ember-500">{analytics.engagement.avgReadingTimeSeconds}s</div>
          <div className="text-sm text-neutral-400 mt-1">Avg Reading Time</div>
        </div>
        <div className="glass-light rounded-xl p-4">
          <div className="text-3xl font-bold text-ember-500">{analytics.engagement.readRate}%</div>
          <div className="text-sm text-neutral-400 mt-1">Read Rate</div>
        </div>
      </div>

      {/* Articles Read Over Time */}
      <div className="glass-light rounded-xl p-6">
        <h3 className="text-lg font-semibold text-neutral-50 mb-4">Articles Read Over Time</h3>
        {analytics.articlesReadOverTime.length > 0 ? (
          <div className="space-y-2">
            {analytics.articlesReadOverTime.map((item) => (
              <div key={item.date} className="flex items-center gap-3">
                <div className="text-xs text-neutral-400 w-20">{item.date.slice(5)}</div>
                <div className="flex-1 h-8 bg-neutral-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-ember-500 transition-all duration-300"
                    style={{ width: `${(item.count / maxReadCount) * 100}%` }}
                  />
                </div>
                <div className="text-sm text-neutral-300 w-8 text-right">{item.count}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 text-sm">No reading activity in this period</p>
        )}
      </div>

      {/* Category Breakdown & Top Articles */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="glass-light rounded-xl p-6">
          <h3 className="text-lg font-semibold text-neutral-50 mb-4">Articles by Source</h3>
          {analytics.categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {analytics.categoryBreakdown.slice(0, 5).map((cat, idx) => {
                const percentage = ((cat.count / totalArticles) * 100).toFixed(1)
                const colors = ['bg-ember-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500']
                return (
                  <div key={cat.source}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-neutral-300">{cat.source}</span>
                      <span className="text-neutral-400">{cat.count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-neutral-800 rounded overflow-hidden">
                      <div
                        className={`h-full ${colors[idx % colors.length]} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-neutral-500 text-sm">No articles yet</p>
          )}
        </div>

        {/* Top Upvoted Articles */}
        <div className="glass-light rounded-xl p-6">
          <h3 className="text-lg font-semibold text-neutral-50 mb-4">Most Upvoted (This Week)</h3>
          {analytics.topUpvotedArticles.length > 0 ? (
            <div className="space-y-3">
              {analytics.topUpvotedArticles.map((item, idx) => (
                <div key={item.article.id} className="flex gap-3">
                  <div className="text-2xl font-bold text-ember-500 w-8">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={item.article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-neutral-300 hover:text-ember-400 transition-colors line-clamp-2"
                    >
                      {item.article.title}
                    </a>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-neutral-500">{item.article.source}</span>
                      <span className="text-xs text-neutral-600">•</span>
                      <span className="text-xs text-ember-500">{item.upvotes} upvotes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500 text-sm">No upvoted articles this week</p>
          )}
        </div>
      </div>

      {/* Productivity Metrics */}
      <div className="glass-light rounded-xl p-6">
        <h3 className="text-lg font-semibold text-neutral-50 mb-4">Productivity</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-2xl font-bold text-neutral-50 mb-2">
              {analytics.productivity.completedTodos} <span className="text-sm text-neutral-400">tasks completed</span>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-neutral-400 mb-2">Log Entries</h4>
            <div className="space-y-2">
              {Object.entries(analytics.productivity.logEntriesByType).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-neutral-300 capitalize">{type}</span>
                  <span className="text-neutral-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Details */}
      <div className="glass-light rounded-xl p-6">
        <h3 className="text-lg font-semibold text-neutral-50 mb-4">Engagement Details</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-neutral-400">Total Views</div>
            <div className="text-2xl font-bold text-neutral-50 mt-1">{analytics.engagement.totalViews}</div>
          </div>
          <div>
            <div className="text-sm text-neutral-400">Avg Scroll Depth</div>
            <div className="text-2xl font-bold text-neutral-50 mt-1">{analytics.engagement.avgScrollPercentage}%</div>
          </div>
          <div>
            <div className="text-sm text-neutral-400">Total Reads</div>
            <div className="text-2xl font-bold text-neutral-50 mt-1">{analytics.engagement.totalReads}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
