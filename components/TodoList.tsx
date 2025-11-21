'use client'

import { useState, useEffect } from 'react'

interface Todo {
  id: number
  text: string
  completed: boolean
  createdAt: string
}

const STORAGE_KEY = 'ember-feed-todos'

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')

  // Load todos from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setTodos(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse todos from localStorage', e)
      }
    }
  }, [])

  // Save todos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodo.trim()) return

    const todo: Todo = {
      id: Date.now(),
      text: newTodo.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    }

    setTodos([todo, ...todos])
    setNewTodo('')
  }

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  const activeTodos = todos.filter(t => !t.completed)
  const completedTodos = todos.filter(t => t.completed)

  return (
    <div className="space-y-4">
      {/* Add Todo Form */}
      <form onSubmit={addTodo} className="flex gap-2">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a quick task..."
          className="flex-1 bg-neutral-800 text-neutral-50 rounded-lg px-4 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500 transition-all"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-ember-500 hover:bg-ember-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Add
        </button>
      </form>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{activeTodos.length} active</span>
        <span>{completedTodos.length} completed</span>
      </div>

      {/* Todo List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        {/* Active Todos */}
        {activeTodos.map(todo => (
          <div
            key={todo.id}
            className="flex items-center gap-3 bg-neutral-800/50 rounded-lg p-3 group hover:bg-neutral-800 transition-colors"
          >
            <button
              onClick={() => toggleTodo(todo.id)}
              className="flex-shrink-0 w-5 h-5 rounded border-2 border-neutral-600 hover:border-ember-500 transition-colors flex items-center justify-center"
            >
              {todo.completed && (
                <svg className="w-3 h-3 text-ember-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className="flex-1 text-neutral-200 text-sm">{todo.text}</span>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="flex-shrink-0 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Completed Todos */}
        {completedTodos.length > 0 && (
          <>
            {activeTodos.length > 0 && (
              <div className="text-xs text-neutral-600 font-medium mt-4 mb-2">Completed</div>
            )}
            {completedTodos.map(todo => (
              <div
                key={todo.id}
                className="flex items-center gap-3 bg-neutral-900/30 rounded-lg p-3 group hover:bg-neutral-900/50 transition-colors opacity-60"
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className="flex-shrink-0 w-5 h-5 rounded border-2 border-ember-500 bg-ember-500 hover:border-ember-600 transition-colors flex items-center justify-center"
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <span className="flex-1 text-neutral-500 text-sm line-through">{todo.text}</span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="flex-shrink-0 text-neutral-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </>
        )}

        {/* Empty State */}
        {todos.length === 0 && (
          <div className="text-center py-8 text-neutral-500 text-sm">
            No tasks yet. Add one above to get started!
          </div>
        )}
      </div>
    </div>
  )
}
