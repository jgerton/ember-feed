'use client'

import { useEffect, useState } from 'react'

interface SummaryStats {
  totalArticles: number
  activeTasks: number
  completedTasks: number
  newIdeas: number
}

/**
 * Daily Overview Widget
 *
 * Collapsible sidebar widget showing daily summary stats:
 * - Articles today
 * - Active tasks
 * - Completed tasks
 * - New ideas
 */
export default function DailyOverviewWidget() {
  const [stats, setStats] = useState<SummaryStats>({
    totalArticles: 0,
    activeTasks: 0,
    completedTasks: 0,
    newIdeas: 0
  })
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch article count from digest API
        const digestRes = await fetch('/api/digest')
        if (digestRes.ok) {
          const digestData = await digestRes.json()
          setStats(prev => ({
            ...prev,
            totalArticles: digestData.stats?.newArticles || 0
          }))
        }

        // Fetch todo stats
        const todosRes = await fetch('/api/todos')
        if (todosRes.ok) {
          const todos = await todosRes.json()
          const active = todos.filter((t: { completed: boolean }) => !t.completed).length
          const completed = todos.filter((t: { completed: boolean }) => t.completed).length
          setStats(prev => ({ ...prev, activeTasks: active, completedTasks: completed }))
        }
      } catch (e) {
        console.error('Failed to load daily stats', e)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="glass-light rounded-xl overflow-hidden">
        <div className="p-4 flex items-center gap-2">
          <div className="w-5 h-5 bg-neutral-800/30 rounded animate-pulse" />
          <div className="h-5 w-28 bg-neutral-800/30 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  const statItems = [
    {
      label: 'Articles Today',
      value: stats.totalArticles,
      color: 'text-ember-500',
      href: '#news-feed',
      icon: '📰'
    },
    {
      label: 'Active Tasks',
      value: stats.activeTasks,
      color: 'text-ember-500',
      href: '#quick-tasks',
      icon: '📋'
    },
    {
      label: 'Completed',
      value: stats.completedTasks,
      color: 'text-green-500',
      href: '#quick-tasks',
      icon: '✅'
    },
    ...(stats.newIdeas > 0 ? [{
      label: 'New Ideas',
      value: stats.newIdeas,
      color: 'text-cyan-500',
      href: '#ideas',
      icon: '💡'
    }] : [])
  ]

  return (
    <div className="glass-light rounded-xl overflow-hidden">
      {/* Header - Always Visible */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:text-ember-400 transition-colors flex-1"
        >
          <span className="text-lg">📊</span>
          <h3 className="text-base font-semibold text-neutral-100">Daily Overview</h3>
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

        {/* Compact stat preview when collapsed */}
        {!isExpanded && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-ember-500 font-semibold">{stats.totalArticles}</span>
            <span className="text-neutral-600">|</span>
            <span className="text-ember-500 font-semibold">{stats.activeTasks}</span>
            <span className="text-neutral-600">|</span>
            <span className="text-green-500 font-semibold">{stats.completedTasks}</span>
          </div>
        )}
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 space-y-2">
          {statItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center justify-between p-2.5 rounded-lg
                       bg-neutral-800/30 hover:bg-neutral-700/40
                       border border-neutral-700/30 hover:border-ember-500/30
                       transition-all duration-200 group"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{item.icon}</span>
                <span className="text-sm text-neutral-300 group-hover:text-neutral-200">
                  {item.label}
                </span>
              </div>
              <span className={`${item.color} font-semibold`}>{item.value}</span>
            </a>
          ))}

          {/* Quick insight */}
          <div className="text-xs text-neutral-500 italic pt-2">
            {stats.completedTasks > 0 ? (
              <>Great progress! {stats.completedTasks} task{stats.completedTasks > 1 ? 's' : ''} done today.</>
            ) : stats.activeTasks > 0 ? (
              <>{stats.activeTasks} task{stats.activeTasks > 1 ? 's' : ''} waiting for you.</>
            ) : (
              <>All caught up! Add tasks to stay organized.</>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
