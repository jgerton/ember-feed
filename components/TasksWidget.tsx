'use client'

import { useState, useEffect } from 'react'

interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: string
}

interface TasksWidgetProps {
  onViewAll?: () => void
  onTaskClick?: (taskId: string) => void
}

/**
 * Tasks Widget - Compact sidebar version of TodoList
 *
 * Shows up to 5 active tasks with scroll, collapsed by default
 * Clicking a task opens the task form in the main content area
 */
export default function TasksWidget({ onViewAll, onTaskClick }: TasksWidgetProps = {}) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    fetchTodos()
  }, [])

  const fetchTodos = async () => {
    try {
      const res = await fetch('/api/todos')
      if (!res.ok) throw new Error('Failed to fetch todos')
      const data = await res.json()
      setTodos(data)
    } catch (error) {
      console.error('Error fetching todos:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed })
      })

      if (!res.ok) throw new Error('Failed to update todo')
      const updated = await res.json()
      setTodos(todos.map(t => t.id === id ? updated : t))
    } catch (error) {
      console.error('Error updating todo:', error)
    }
  }

  const activeTodos = todos.filter(t => !t.completed)
  const hasTasks = activeTodos.length > 0

  return (
    <div className="glass-light rounded-xl overflow-hidden">
      {/* Header - Always Visible */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:text-ember-400 transition-colors flex-1"
        >
          <h3 className="text-base font-semibold text-neutral-100">Tasks</h3>
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
        {onViewAll && hasTasks && (
          <button
            onClick={onViewAll}
            className="text-xs text-neutral-400 hover:text-ember-400 transition-colors whitespace-nowrap"
          >
            View all →
          </button>
        )}
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-neutral-800/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !hasTasks ? (
            <p className="text-sm text-neutral-400 text-center py-4">No active tasks</p>
          ) : (
            <>
              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
                <span>{activeTodos.length} active</span>
              </div>

              {/* Task List - Limited to 5 with scroll */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent hover:scrollbar-thumb-neutral-600">
                {activeTodos.slice(0, 10).map(todo => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-2 bg-neutral-800/50 rounded-lg p-2.5 group hover:bg-neutral-800 transition-colors"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleTodo(todo.id)
                      }}
                      className="flex-shrink-0 w-4 h-4 rounded border-2 border-neutral-600 hover:border-ember-500 transition-colors flex items-center justify-center"
                    >
                      {todo.completed && (
                        <svg className="w-2.5 h-2.5 text-ember-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => onTaskClick?.(todo.id)}
                      className="flex-1 text-left text-neutral-200 text-sm line-clamp-2 hover:text-ember-400 transition-colors"
                    >
                      {todo.text}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
