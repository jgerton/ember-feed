'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface Feed {
  id: string
  name: string
  url: string
  status: string
  consecutiveFailures: number
  lastSuccessAt: string | null
  lastFailureAt: string | null
  lastErrorMessage: string | null
  priority: number
}

interface FeedHealthSummary {
  total: number
  active: number
  failing: number
  quarantined: number
  feeds: Feed[]
}

export default function FeedAdmin() {
  const [summary, setSummary] = useState<FeedHealthSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Add feed form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newFeedName, setNewFeedName] = useState('')
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [newFeedPriority, setNewFeedPriority] = useState(50)
  const [adding, setAdding] = useState(false)

  // Edit priority state
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null)
  const [editPriorityValue, setEditPriorityValue] = useState(50)

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/feeds/health')
      if (!res.ok) throw new Error('Failed to fetch feed health')
      const data = await res.json()
      setSummary(data)
    } catch (error) {
      console.error('Error fetching feed health:', error)
      setMessage({ type: 'error', text: 'Failed to fetch feed health' })
    } finally {
      setLoading(false)
    }
  }

  const testFeed = async (feedId: string) => {
    setTestingId(feedId)
    setMessage(null)
    try {
      const res = await fetch(`/api/feeds/${feedId}`)
      const result = await res.json()

      if (result.success) {
        setMessage({ type: 'success', text: `Feed test successful: ${result.name} (${result.articlesCount} articles)` })
      } else {
        setMessage({ type: 'error', text: `Feed test failed: ${result.error}` })
      }

      await fetchHealth()
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to test feed' })
    } finally {
      setTestingId(null)
    }
  }

  const restoreFeed = async (feedId: string) => {
    setRestoringId(feedId)
    setMessage(null)
    try {
      const res = await fetch(`/api/feeds/${feedId}`, { method: 'POST' })
      const result = await res.json()

      if (result.success) {
        setMessage({ type: 'success', text: result.message })
      } else {
        setMessage({ type: 'error', text: result.message })
      }

      await fetchHealth()
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to restore feed' })
    } finally {
      setRestoringId(null)
    }
  }

  const addFeed = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFeedName.trim() || !newFeedUrl.trim()) return

    setAdding(true)
    setMessage(null)
    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFeedName.trim(),
          url: newFeedUrl.trim(),
          priority: newFeedPriority
        })
      })

      const result = await res.json()

      if (result.success) {
        setMessage({ type: 'success', text: result.message })
        setNewFeedName('')
        setNewFeedUrl('')
        setNewFeedPriority(50)
        setShowAddForm(false)
        await fetchHealth()
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to add feed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add feed' })
    } finally {
      setAdding(false)
    }
  }

  const deleteFeed = async (feedId: string, feedName: string) => {
    if (!confirm(`Are you sure you want to delete "${feedName}"?`)) return

    setDeletingId(feedId)
    setMessage(null)
    try {
      const res = await fetch(`/api/feeds/${feedId}`, { method: 'DELETE' })
      const result = await res.json()

      if (result.success) {
        setMessage({ type: 'success', text: result.message })
        await fetchHealth()
      } else {
        setMessage({ type: 'error', text: 'Failed to delete feed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete feed' })
    } finally {
      setDeletingId(null)
    }
  }

  const updatePriority = async (feedId: string, newPriority: number) => {
    try {
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      })

      const result = await res.json()

      if (result.success) {
        await fetchHealth()
      } else {
        setMessage({ type: 'error', text: 'Failed to update priority' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update priority' })
    } finally {
      setEditingPriorityId(null)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  if (loading) {
    return <div className="p-4">Loading feed health...</div>
  }

  if (!summary) {
    return <div className="p-4 text-red-600">Failed to load feed health</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-300 bg-green-500/20 border border-green-500/30'
      case 'failing':
        return 'text-yellow-300 bg-yellow-500/20 border border-yellow-500/30'
      case 'quarantined':
        return 'text-red-300 bg-red-500/20 border border-red-500/30'
      default:
        return 'text-neutral-400 bg-neutral-500/20 border border-neutral-500/30'
    }
  }

  return (
    <div className="glass-medium rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-50">Feed Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {showAddForm ? 'Cancel' : 'Add Feed'}
          </button>
          <button
            onClick={fetchHealth}
            className="px-4 py-2 bg-ember-600 text-white rounded-lg hover:bg-ember-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Add Feed Form */}
      {showAddForm && (
        <form onSubmit={addFeed} className="mb-6 p-4 glass-light rounded-lg">
          <h3 className="text-lg font-semibold text-neutral-50 mb-4">Add New RSS Feed</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Feed Name</label>
              <input
                type="text"
                value={newFeedName}
                onChange={(e) => setNewFeedName(e.target.value)}
                placeholder="e.g., Tech Crunch"
                className="w-full p-2 bg-neutral-800/50 border border-white/10 text-neutral-50 placeholder-neutral-500 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-ember-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">RSS Feed URL</label>
              <input
                type="url"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
                className="w-full p-2 bg-neutral-800/50 border border-white/10 text-neutral-50 placeholder-neutral-500 rounded-lg focus:ring-2 focus:ring-ember-500 focus:border-ember-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Priority (0-100): {newFeedPriority}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={newFeedPriority}
                onChange={(e) => setNewFeedPriority(parseInt(e.target.value))}
                className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-ember-500"
              />
            </div>

            <button
              type="submit"
              disabled={adding || !newFeedName.trim() || !newFeedUrl.trim()}
              className="w-full px-4 py-2 bg-ember-600 text-white rounded-lg hover:bg-ember-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? 'Adding...' : 'Add Feed'}
            </button>
          </div>
        </form>
      )}

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="glass-light p-4 rounded-lg">
          <div className="text-sm text-neutral-400">Total Feeds</div>
          <div className="text-2xl font-bold text-neutral-50">{summary.total}</div>
        </div>
        <div className="glass-light p-4 rounded-lg border border-green-500/20">
          <div className="text-sm text-green-400">Active</div>
          <div className="text-2xl font-bold text-green-300">{summary.active}</div>
        </div>
        <div className="glass-light p-4 rounded-lg border border-yellow-500/20">
          <div className="text-sm text-yellow-400">Failing</div>
          <div className="text-2xl font-bold text-yellow-300">{summary.failing}</div>
        </div>
        <div className="glass-light p-4 rounded-lg border border-red-500/20">
          <div className="text-sm text-red-400">Quarantined</div>
          <div className="text-2xl font-bold text-red-300">{summary.quarantined}</div>
        </div>
      </div>

      <div className="space-y-4">
        {summary.feeds.map((feed) => (
          <div
            key={feed.id}
            className="glass-light border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-neutral-50">{feed.name}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(feed.status)}`}
                  >
                    {feed.status}
                  </span>
                  {feed.consecutiveFailures > 0 && (
                    <span className="text-xs text-neutral-400">
                      {feed.consecutiveFailures} consecutive failures
                    </span>
                  )}
                </div>

                <div className="text-sm text-neutral-400 mb-2">
                  <span className="font-mono">{feed.url}</span>
                </div>

                <div className="flex gap-6 text-sm text-neutral-400">
                  <div className="flex items-center gap-2">
                    {editingPriorityId === feed.id ? (
                      <>
                        <span>Priority:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editPriorityValue}
                          onChange={(e) => setEditPriorityValue(parseInt(e.target.value) || 0)}
                          onBlur={() => updatePriority(feed.id, editPriorityValue)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updatePriority(feed.id, editPriorityValue)
                            if (e.key === 'Escape') setEditingPriorityId(null)
                          }}
                          autoFocus
                          className="w-16 px-2 py-1 bg-neutral-800/50 border border-white/10 text-neutral-50 rounded focus:ring-2 focus:ring-ember-500"
                        />
                      </>
                    ) : (
                      <>
                        <span>Priority:</span>
                        <button
                          onClick={() => {
                            setEditingPriorityId(feed.id)
                            setEditPriorityValue(feed.priority)
                          }}
                          className="font-medium text-neutral-300 hover:text-ember-500 transition-colors"
                        >
                          {feed.priority} ✏️
                        </button>
                      </>
                    )}
                  </div>
                  {feed.lastSuccessAt && (
                    <div>
                      Last success:{' '}
                      <span className="font-medium text-neutral-300">
                        {formatDistanceToNow(new Date(feed.lastSuccessAt), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                  {feed.lastFailureAt && (
                    <div>
                      Last failure:{' '}
                      <span className="font-medium text-neutral-300">
                        {formatDistanceToNow(new Date(feed.lastFailureAt), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>

                {feed.lastErrorMessage && (
                  <div className="mt-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-300">
                    <span className="font-semibold">Error: </span>
                    {feed.lastErrorMessage}
                  </div>
                )}
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => testFeed(feed.id)}
                  disabled={testingId === feed.id}
                  className="px-3 py-1 bg-ember-600 text-white rounded-lg hover:bg-ember-700 disabled:opacity-50 text-sm transition-colors"
                >
                  {testingId === feed.id ? 'Testing...' : 'Test'}
                </button>

                {feed.status === 'quarantined' && (
                  <button
                    onClick={() => restoreFeed(feed.id)}
                    disabled={restoringId === feed.id}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm transition-colors"
                  >
                    {restoringId === feed.id ? 'Restoring...' : 'Restore'}
                  </button>
                )}

                <button
                  onClick={() => deleteFeed(feed.id, feed.name)}
                  disabled={deletingId === feed.id}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm transition-colors"
                >
                  {deletingId === feed.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
