'use client'

import { useEffect, useState } from 'react'

interface SummaryStats {
  totalArticles: number
  topScore: number
  activeTasks: number
  completedTasks: number
}

export default function DailySummary() {
  const [stats, setStats] = useState<SummaryStats>({
    totalArticles: 5,
    topScore: 95,
    activeTasks: 0,
    completedTasks: 0
  })

  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')

    // Load todo stats from API
    const fetchTodoStats = async () => {
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

    fetchTodoStats()
  }, [])

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="text-lg text-neutral-200">
        <span className="font-semibold text-ember-400">{greeting}!</span> Here's your daily summary:
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Articles */}
        <a
          href="#news-feed"
          className="glass-light rounded-xl p-4 text-center hover:glass-medium transition-all duration-200 cursor-pointer group"
        >
          <div className="text-3xl font-bold text-ember-500 group-hover:text-ember-400 transition-colors">{stats.totalArticles}</div>
          <div className="text-sm text-neutral-400 mt-1 group-hover:text-neutral-300 transition-colors">Articles Today</div>
        </a>

        {/* Top Score */}
        <a
          href="#news-feed"
          className="glass-light rounded-xl p-4 text-center hover:glass-medium transition-all duration-200 cursor-pointer group"
        >
          <div className="text-3xl font-bold text-ember-500 group-hover:text-ember-400 transition-colors">{stats.topScore}</div>
          <div className="text-sm text-neutral-400 mt-1 group-hover:text-neutral-300 transition-colors">Top Score</div>
        </a>

        {/* Active Tasks */}
        <a
          href="#quick-tasks"
          className="glass-light rounded-xl p-4 text-center hover:glass-medium transition-all duration-200 cursor-pointer group"
        >
          <div className="text-3xl font-bold text-ember-500 group-hover:text-ember-400 transition-colors">{stats.activeTasks}</div>
          <div className="text-sm text-neutral-400 mt-1 group-hover:text-neutral-300 transition-colors">Active Tasks</div>
        </a>

        {/* Completed Tasks */}
        <a
          href="#quick-tasks"
          className="glass-light rounded-xl p-4 text-center hover:glass-medium transition-all duration-200 cursor-pointer group"
        >
          <div className="text-3xl font-bold text-green-500 group-hover:text-green-400 transition-colors">{stats.completedTasks}</div>
          <div className="text-sm text-neutral-400 mt-1 group-hover:text-neutral-300 transition-colors">Completed</div>
        </a>
      </div>

      {/* Quick insight */}
      <div className="text-sm text-neutral-400 italic">
        {stats.completedTasks > 0 ? (
          <>Great progress! You've completed {stats.completedTasks} task{stats.completedTasks > 1 ? 's' : ''} today. 🎉</>
        ) : stats.activeTasks > 0 ? (
          <>You have {stats.activeTasks} task{stats.activeTasks > 1 ? 's' : ''} waiting for you.</>
        ) : (
          <>All caught up! Add some tasks to stay organized.</>
        )}
      </div>
    </div>
  )
}
