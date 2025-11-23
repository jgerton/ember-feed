'use client'

import { useState, useEffect } from 'react'

interface Topic {
  name: string
  slug: string
}

interface ArticleTopic {
  topic: Topic
  relevance: number
}

interface Article {
  id: string
  title: string
  source: string
  url: string
  description: string
  publishedAt: string
  score: number
  topics?: ArticleTopic[]
}

interface SavedArticle {
  id: string
  articleId: string
  priority: number
  isRead: boolean
  notes: string | null
  savedAt: string
  readAt: string | null
  article: Article
}

export default function ReadLaterPage() {
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')

  useEffect(() => {
    fetchSavedArticles()
  }, [])

  const fetchSavedArticles = async () => {
    try {
      const res = await fetch('/api/saved-articles')
      if (!res.ok) throw new Error('Failed to fetch saved articles')
      const data = await res.json()
      setSavedArticles(data)
    } catch (error) {
      console.error('Error fetching saved articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSavedArticle = async (id: string, updates: Partial<SavedArticle>) => {
    try {
      const res = await fetch(`/api/saved-articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!res.ok) throw new Error('Failed to update article')

      const updated = await res.json()

      // Update local state
      setSavedArticles(prev =>
        prev.map(sa => (sa.id === id ? updated : sa))
      )
    } catch (error) {
      console.error('Error updating saved article:', error)
    }
  }

  const removeSavedArticle = async (id: string) => {
    if (!confirm('Remove this article from your Read Later queue?')) return

    try {
      const res = await fetch(`/api/saved-articles/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete article')

      // Remove from local state
      setSavedArticles(prev => prev.filter(sa => sa.id !== id))
    } catch (error) {
      console.error('Error deleting saved article:', error)
    }
  }

  const toggleReadStatus = (savedArticle: SavedArticle) => {
    updateSavedArticle(savedArticle.id, { isRead: !savedArticle.isRead })
  }

  const changePriority = (savedArticle: SavedArticle, newPriority: number) => {
    updateSavedArticle(savedArticle.id, { priority: newPriority })
  }

  const saveNotes = (savedArticle: SavedArticle) => {
    updateSavedArticle(savedArticle.id, { notes: notesValue })
    setEditingNotes(null)
    setNotesValue('')
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getPriorityLabel = (priority: number): string => {
    const labels = {
      5: 'Urgent',
      4: 'High',
      3: 'Medium',
      2: 'Low',
      1: 'Very Low'
    }
    return labels[priority as keyof typeof labels] || 'Medium'
  }

  const getPriorityColor = (priority: number): string => {
    const colors = {
      5: 'text-red-400 bg-red-500/20 border-red-800/50',
      4: 'text-orange-400 bg-orange-500/20 border-orange-800/50',
      3: 'text-ember-400 bg-ember-500/20 border-ember-800/50',
      2: 'text-yellow-400 bg-yellow-500/20 border-yellow-800/50',
      1: 'text-neutral-400 bg-neutral-500/20 border-neutral-700/50'
    }
    return colors[priority as keyof typeof colors] || colors[3]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-900 to-ember-950 text-neutral-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8 text-neutral-500">
            Loading your saved articles...
          </div>
        </div>
      </div>
    )
  }

  const unreadCount = savedArticles.filter(sa => !sa.isRead).length
  const readCount = savedArticles.filter(sa => sa.isRead).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-900 to-ember-950 text-neutral-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-ember-400 mb-2">Read Later Queue</h1>
          <div className="flex items-center gap-4 text-sm text-neutral-400">
            <span>{unreadCount} unread</span>
            <span>•</span>
            <span>{readCount} read</span>
            <span>•</span>
            <span>{savedArticles.length} total</span>
          </div>
        </div>

        {/* Empty State */}
        {savedArticles.length === 0 && (
          <div className="glass-light rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">🔖</div>
            <h2 className="text-xl font-semibold text-neutral-300 mb-2">
              No saved articles yet
            </h2>
            <p className="text-neutral-500">
              Click "Save for Later" on any article to add it to your reading queue.
            </p>
          </div>
        )}

        {/* Saved Articles List */}
        <div className="space-y-4">
          {savedArticles.map((savedArticle) => {
            const article = savedArticle.article
            const isEditingNotes = editingNotes === savedArticle.id

            return (
              <article
                key={savedArticle.id}
                className={`glass-light rounded-xl p-5 hover:glass-medium transition-all duration-200 ${
                  savedArticle.isRead ? 'opacity-60' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {/* Priority Badge */}
                      <div className="relative group">
                        <span className={`px-2 py-0.5 text-xs rounded-md border ${getPriorityColor(savedArticle.priority)}`}>
                          {getPriorityLabel(savedArticle.priority)}
                        </span>
                        {/* Priority Dropdown */}
                        <div className="absolute top-full left-0 mt-1 hidden group-hover:block bg-neutral-800 rounded-lg shadow-xl border border-neutral-700 z-10">
                          <div className="p-1">
                            {[5, 4, 3, 2, 1].map((priority) => (
                              <button
                                key={priority}
                                onClick={() => changePriority(savedArticle, priority)}
                                className={`block w-full text-left px-3 py-1.5 text-xs rounded hover:bg-neutral-700 transition-colors ${
                                  savedArticle.priority === priority ? 'bg-neutral-700' : ''
                                }`}
                              >
                                {getPriorityLabel(priority)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Read Status Badge */}
                      {savedArticle.isRead && (
                        <span className="px-2 py-0.5 text-xs rounded-md bg-green-500/20 text-green-400 border border-green-800/50">
                          ✓ Read
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-neutral-50 mb-1">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-neutral-400">
                      <span className="text-ember-500 font-medium">{article.source}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(article.publishedAt)}</span>
                      <span>•</span>
                      <span>Saved {formatDate(savedArticle.savedAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center ml-4">
                    <div className="text-2xl font-bold text-ember-500">{article.score}</div>
                    <div className="text-xs text-neutral-500">score</div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-neutral-300 text-sm leading-relaxed mb-3">
                  {article.description}
                </p>

                {/* Topics */}
                {article.topics && article.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {article.topics.slice(0, 3).map((topicData) => (
                      <span
                        key={topicData.topic.slug}
                        className="px-2 py-0.5 text-xs rounded-md bg-ember-900/30 text-ember-400 border border-ember-800/50"
                      >
                        {topicData.topic.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notes Section */}
                <div className="mb-3">
                  {isEditingNotes ? (
                    <div className="space-y-2">
                      <textarea
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        placeholder="Add notes about this article..."
                        className="w-full px-3 py-2 rounded-lg bg-neutral-800 text-neutral-100 placeholder-neutral-500 border border-neutral-700 focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20 transition-colors text-sm resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveNotes(savedArticle)}
                          className="px-3 py-1 text-xs rounded-lg bg-ember-600 hover:bg-ember-700 text-white transition-colors"
                        >
                          Save Notes
                        </button>
                        <button
                          onClick={() => {
                            setEditingNotes(null)
                            setNotesValue('')
                          }}
                          className="px-3 py-1 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : savedArticle.notes ? (
                    <div
                      onClick={() => {
                        setEditingNotes(savedArticle.id)
                        setNotesValue(savedArticle.notes || '')
                      }}
                      className="p-2 rounded-lg bg-neutral-800/50 text-neutral-300 text-sm cursor-pointer hover:bg-neutral-800 transition-colors"
                    >
                      <div className="text-xs text-neutral-500 mb-1">Notes:</div>
                      {savedArticle.notes}
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingNotes(savedArticle.id)}
                      className="text-xs text-neutral-500 hover:text-neutral-400 transition-colors"
                    >
                      + Add notes
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    Read Article →
                  </a>
                  <button
                    onClick={() => toggleReadStatus(savedArticle)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    {savedArticle.isRead ? 'Mark Unread' : 'Mark as Read'}
                  </button>
                  <button
                    onClick={() => removeSavedArticle(savedArticle.id)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-red-900/20 hover:bg-red-900/30 text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
