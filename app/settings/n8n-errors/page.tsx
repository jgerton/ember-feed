'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface N8nError {
  id: string
  workflowId: string
  workflowName: string
  executionId: string
  nodeId?: string
  nodeName?: string
  errorType: string
  errorMessage: string
  feedId?: string
  context?: Record<string, unknown>
  resolved: boolean
  resolvedAt?: string
  createdAt: string
  feed?: {
    id: string
    name: string
    url: string
  }
}

interface ErrorStats {
  unresolved: number
  resolved: number
  total: number
}

export default function N8nErrorsPage() {
  const [errors, setErrors] = useState<N8nError[]>([])
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved')

  const fetchErrors = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.set('resolved', filter === 'resolved' ? 'true' : 'false')
      }
      const res = await fetch(`/api/n8n/errors?${params}`)
      const data = await res.json()
      if (data.success) {
        setErrors(data.errors)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch n8n errors:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchErrors()
  }, [filter])

  const markResolved = async (errorId: string) => {
    try {
      const res = await fetch(`/api/n8n/errors/${errorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      })
      if (res.ok) {
        fetchErrors()
      }
    } catch (error) {
      console.error('Failed to mark error as resolved:', error)
    }
  }

  const getErrorTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'api_error':
        return 'text-red-400 bg-red-400/10'
      case 'parse_error':
        return 'text-yellow-400 bg-yellow-400/10'
      case 'timeout':
        return 'text-orange-400 bg-orange-400/10'
      default:
        return 'text-neutral-400 bg-neutral-400/10'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/settings"
              className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block"
            >
              Settings
            </Link>
            <h1 className="text-2xl font-bold text-neutral-100">n8n Workflow Errors</h1>
          </div>
          <button
            onClick={fetchErrors}
            className="px-4 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
              <div className="text-2xl font-bold text-red-400">{stats.unresolved}</div>
              <div className="text-sm text-neutral-400">Unresolved</div>
            </div>
            <div className="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
              <div className="text-2xl font-bold text-green-400">{stats.resolved}</div>
              <div className="text-sm text-neutral-400">Resolved</div>
            </div>
            <div className="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
              <div className="text-2xl font-bold text-neutral-300">{stats.total}</div>
              <div className="text-sm text-neutral-400">Total</div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {(['unresolved', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                filter === f
                  ? 'bg-ember-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Error List */}
        {loading ? (
          <div className="text-center py-8 text-neutral-500">Loading...</div>
        ) : errors.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            No {filter !== 'all' ? filter : ''} errors found
          </div>
        ) : (
          <div className="space-y-4">
            {errors.map((error) => (
              <div
                key={error.id}
                className={`p-4 rounded-lg border ${
                  error.resolved
                    ? 'bg-neutral-800/30 border-neutral-700/50'
                    : 'bg-neutral-800/50 border-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${getErrorTypeColor(
                        error.errorType
                      )}`}
                    >
                      {error.errorType}
                    </span>
                    <span className="text-sm text-neutral-400">{error.workflowName}</span>
                    {error.nodeName && (
                      <span className="text-xs text-neutral-500">({error.nodeName})</span>
                    )}
                  </div>
                  {!error.resolved && (
                    <button
                      onClick={() => markResolved(error.id)}
                      className="px-3 py-1 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>

                <p className="text-sm text-neutral-200 mb-2">{error.errorMessage}</p>

                <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                  <span>Created: {formatDate(error.createdAt)}</span>
                  {error.resolvedAt && <span>Resolved: {formatDate(error.resolvedAt)}</span>}
                  {error.feed && (
                    <span>
                      Feed:{' '}
                      <span className="text-neutral-400">{error.feed.name}</span>
                    </span>
                  )}
                  <span>Execution: {error.executionId.slice(0, 8)}...</span>
                </div>

                {error.context && Object.keys(error.context).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-400">
                      Show context
                    </summary>
                    <pre className="mt-2 p-2 text-xs bg-neutral-900 rounded overflow-auto max-h-32">
                      {JSON.stringify(error.context, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
