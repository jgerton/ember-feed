'use client'

import { useEffect, useState } from 'react'

interface Priority {
  id: string
  text: string
  completed: boolean
  priority: 'high' | 'medium' | 'low'
}

interface TodaysPrioritiesProps {
  onViewAllTasks?: () => void
}

export default function TodaysPriorities({ onViewAllTasks }: TodaysPrioritiesProps = {}) {
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const fetchPriorities = async () => {
      try {
        const res = await fetch('/api/todos')
        if (!res.ok) throw new Error('Failed to fetch todos')
        const todos = await res.json()

        // Get top 3 active tasks
        const activeTasks = todos
          .filter((t: { completed: boolean }) => !t.completed)
          .slice(0, 3)
          .map((t: { id: string; text: string; completed: boolean }) => ({
            ...t,
            priority: 'high' as const // Default to high for MVP
          }))

        setPriorities(activeTasks)
      } catch (e) {
        console.error('Failed to load priorities', e)
      } finally {
        setLoading(false)
      }
    }

    fetchPriorities()
  }, [])

  const togglePriority = async (id: string) => {
    try {
      const priority = priorities.find(p => p.id === id)
      if (!priority) return

      const res = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !priority.completed })
      })

      if (!res.ok) throw new Error('Failed to update todo')

      // Update local state
      setPriorities(prev =>
        prev.map(p => p.id === id ? { ...p, completed: !p.completed } : p)
      )

      // Refresh the list after 500ms to get next task
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (e) {
      console.error('Failed to toggle priority', e)
    }
  }

  if (loading) {
    return (
      <div className="glass-light rounded-xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-neutral-700 rounded w-1/3"></div>
          <div className="h-12 bg-neutral-700 rounded"></div>
          <div className="h-12 bg-neutral-700 rounded"></div>
          <div className="h-12 bg-neutral-700 rounded"></div>
        </div>
      </div>
    )
  }

  const hasPriorities = priorities.length > 0

  return (
    <div className="glass-light rounded-xl overflow-hidden">
      {/* Header - Always Visible */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover:text-ember-400 transition-colors group"
          >
            <span className="text-xl">🎯</span>
            <h3 className="text-base font-semibold text-neutral-100">
              Today's Priorities
            </h3>
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
        </div>

        {/* View All Link - Always Visible */}
        {onViewAllTasks && hasPriorities && (
          <button
            onClick={onViewAllTasks}
            className="text-xs text-neutral-400 hover:text-ember-400 transition-colors whitespace-nowrap"
          >
            View all →
          </button>
        )}
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          {!hasPriorities ? (
            <p className="text-sm text-neutral-400 italic">No priorities set. Add some tasks to get started!</p>
          ) : (
            <div className="space-y-2">
              {priorities.map((priority, index) => (
                <div
                  key={priority.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                    priority.completed
                      ? 'bg-neutral-800/30 opacity-60'
                      : 'bg-ember-950/20 border border-ember-900/30 hover:border-ember-800/50'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => togglePriority(priority.id)}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      priority.completed
                        ? 'bg-green-600 border-green-600'
                        : 'border-ember-600 hover:border-ember-500 hover:bg-ember-950/30'
                    }`}
                  >
                    {priority.completed && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Priority Number */}
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    priority.completed
                      ? 'bg-neutral-700 text-neutral-500'
                      : index === 0
                      ? 'bg-ember-600 text-white'
                      : index === 1
                      ? 'bg-ember-700 text-white'
                      : 'bg-ember-800 text-neutral-300'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Task Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${
                      priority.completed
                        ? 'line-through text-neutral-500'
                        : 'text-neutral-200'
                    }`}>
                      {priority.text}
                    </p>
                  </div>

                  {/* Priority Badge */}
                  {!priority.completed && (
                    <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full ${
                      priority.priority === 'high'
                        ? 'bg-red-950 text-red-400 border border-red-900'
                        : priority.priority === 'medium'
                        ? 'bg-yellow-950 text-yellow-400 border border-yellow-900'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {priority.priority.toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
