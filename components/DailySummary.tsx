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

    // Load todo stats from localStorage
    try {
      const stored = localStorage.getItem('ember-feed-todos')
      if (stored) {
        const todos = JSON.parse(stored)
        const active = todos.filter((t: { completed: boolean }) => !t.completed).length
        const completed = todos.filter((t: { completed: boolean }) => t.completed).length
        setStats(prev => ({ ...prev, activeTasks: active, completedTasks: completed }))
      }
    } catch (e) {
      console.error('Failed to load todo stats', e)
    }
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
        <div className="glass-light rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-ember-500">{stats.totalArticles}</div>
          <div className="text-sm text-neutral-400 mt-1">Articles Today</div>
        </div>

        {/* Top Score */}
        <div className="glass-light rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-ember-500">{stats.topScore}</div>
          <div className="text-sm text-neutral-400 mt-1">Top Score</div>
        </div>

        {/* Active Tasks */}
        <div className="glass-light rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-ember-500">{stats.activeTasks}</div>
          <div className="text-sm text-neutral-400 mt-1">Active Tasks</div>
        </div>

        {/* Completed Tasks */}
        <div className="glass-light rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-500">{stats.completedTasks}</div>
          <div className="text-sm text-neutral-400 mt-1">Completed</div>
        </div>
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
