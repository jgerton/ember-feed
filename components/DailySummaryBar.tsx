'use client'

import { useEffect, useState } from 'react'

interface SummaryStats {
  totalArticles: number
  activeTasks: number
  completedTasks: number
  newIdeas: number
}

export default function DailySummaryBar() {
  const [stats, setStats] = useState<SummaryStats>({
    totalArticles: 5,
    activeTasks: 0,
    completedTasks: 0,
    newIdeas: 0
  })

  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    // Load todo stats from API
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/todos')
        if (!res.ok) throw new Error('Failed to fetch todos')
        const todos = await res.json()
        const active = todos.filter((t: { completed: boolean }) => !t.completed).length
        const completed = todos.filter((t: { completed: boolean }) => t.completed).length
        setStats(prev => ({ ...prev, activeTasks: active, completedTasks: completed }))
      } catch (e) {
        console.error('Failed to load todo stats', e)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="glass-light rounded-xl overflow-hidden">
      {/* Compact Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 sm:px-6 py-3 flex items-center justify-between hover:bg-neutral-800/20 transition-colors"
      >
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap sm:flex-nowrap">
          <span className="text-sm font-medium text-neutral-300 hidden sm:inline">Today:</span>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <a
              href="#news-feed"
              className="flex items-center gap-1 sm:gap-2 hover:text-ember-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-ember-500 font-semibold">{stats.totalArticles}</span>
              <span className="text-xs text-neutral-400">articles</span>
            </a>
            <span className="text-neutral-700 hidden sm:inline">•</span>
            <a
              href="#quick-tasks"
              className="flex items-center gap-1 sm:gap-2 hover:text-ember-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-ember-500 font-semibold">{stats.activeTasks}</span>
              <span className="text-xs text-neutral-400">tasks</span>
            </a>
            <span className="text-neutral-700 hidden sm:inline">•</span>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-green-500 font-semibold">{stats.completedTasks}</span>
              <span className="text-xs text-neutral-400">done</span>
            </div>
            {stats.newIdeas > 0 && (
              <>
                <span className="text-neutral-700 hidden sm:inline">•</span>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-cyan-500 font-semibold">{stats.newIdeas}</span>
                  <span className="text-xs text-neutral-400">ideas</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 text-xs text-neutral-500 flex-shrink-0 ml-2">
          <span className="hidden sm:inline">{isExpanded ? 'Hide' : 'Details'}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-6 pb-4 pt-2 border-t border-neutral-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            {/* Total Articles */}
            <a
              href="#news-feed"
              className="glass-medium rounded-lg p-3 text-center hover:glass-light transition-all duration-200 cursor-pointer group"
            >
              <div className="text-2xl font-bold text-ember-500 group-hover:text-ember-400 transition-colors">{stats.totalArticles}</div>
              <div className="text-xs text-neutral-400 mt-1 group-hover:text-neutral-300 transition-colors">Articles Today</div>
            </a>

            {/* Active Tasks */}
            <a
              href="#quick-tasks"
              className="glass-medium rounded-lg p-3 text-center hover:glass-light transition-all duration-200 cursor-pointer group"
            >
              <div className="text-2xl font-bold text-ember-500 group-hover:text-ember-400 transition-colors">{stats.activeTasks}</div>
              <div className="text-xs text-neutral-400 mt-1 group-hover:text-neutral-300 transition-colors">Active Tasks</div>
            </a>

            {/* Completed Tasks */}
            <a
              href="#quick-tasks"
              className="glass-medium rounded-lg p-3 text-center hover:glass-light transition-all duration-200 cursor-pointer group"
            >
              <div className="text-2xl font-bold text-green-500 group-hover:text-green-400 transition-colors">{stats.completedTasks}</div>
              <div className="text-xs text-neutral-400 mt-1 group-hover:text-neutral-300 transition-colors">Completed</div>
            </a>

            {/* New Ideas */}
            <div className="glass-medium rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-cyan-500">{stats.newIdeas}</div>
              <div className="text-xs text-neutral-400 mt-1">New Ideas</div>
            </div>
          </div>

          {/* Quick insight */}
          <div className="text-xs text-neutral-400 italic mt-3">
            {stats.completedTasks > 0 ? (
              <>Great progress! You completed {stats.completedTasks} task{stats.completedTasks > 1 ? 's' : ''} today.</>
            ) : stats.activeTasks > 0 ? (
              <>You have {stats.activeTasks} task{stats.activeTasks > 1 ? 's' : ''} waiting for you.</>
            ) : (
              <>All caught up! Add tasks to stay organized.</>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
