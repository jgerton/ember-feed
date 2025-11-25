'use client'

import { useState, useEffect } from 'react'
import { Select } from '@/components/ui/Select'

interface Article {
  id: string
  title: string
  url: string
  source: string
}

interface VideoInsightsFields {
  url?: string | null
  timestamp?: string | null
  creator?: string | null
  keyQuote?: string | null
}

interface UrlMetadataFields {
  url?: string | null
  metadata?: {
    title?: string
    author?: string | null
    siteName?: string
    description?: string
    publishedDate?: string | null
    feeds?: Array<{
      url: string
      title: string
      isSubscribed?: boolean
    }>
  } | null
}

interface Thought {
  id: string
  text: string
  category: string | null
  categoryFields?: VideoInsightsFields | UrlMetadataFields | null
  createdAt: string
  updatedAt: string
  article?: Article | null
}

interface ThoughtsViewProps {
  onCaptureNew?: () => void
}

export default function ThoughtsView({ onCaptureNew }: ThoughtsViewProps) {
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editCategory, setEditCategory] = useState('')

  useEffect(() => {
    fetchThoughts()
  }, [selectedCategory])

  const fetchThoughts = async () => {
    try {
      const url = selectedCategory
        ? `/api/thoughts?category=${encodeURIComponent(selectedCategory)}`
        : '/api/thoughts'

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch thoughts')
      const data = await res.json()
      setThoughts(data)

      // Only update allCategories when fetching unfiltered thoughts
      // This preserves all category options in the dropdown regardless of filter
      if (!selectedCategory) {
        const categories = Array.from(new Set(data.map((t: Thought) => t.category).filter(Boolean))) as string[]
        setAllCategories(categories)
      }
    } catch (error) {
      console.error('Error fetching thoughts:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteThought = async (id: string) => {
    if (!confirm('Delete this thought?')) return

    try {
      const res = await fetch(`/api/thoughts/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete thought')
      setThoughts(thoughts.filter(t => t.id !== id))
    } catch (error) {
      console.error('Error deleting thought:', error)
    }
  }

  const startEdit = (thought: Thought) => {
    setEditingId(thought.id)
    setEditText(thought.text)
    setEditCategory(thought.category || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
    setEditCategory('')
  }

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/thoughts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editText,
          category: editCategory || null
        })
      })

      if (!res.ok) throw new Error('Failed to update thought')
      const updated = await res.json()
      setThoughts(thoughts.map(t => t.id === id ? updated : t))
      cancelEdit()
    } catch (error) {
      console.error('Error updating thought:', error)
    }
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  // Build Select options from allCategories
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...allCategories.map(cat => ({ value: cat, label: cat }))
  ]

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-neutral-800/30 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-neutral-300">
            <span className="font-semibold text-ember-400">{thoughts.length}</span> thoughts captured
          </div>

          {/* Category Filter */}
          {allCategories.length > 0 && (
            <Select
              value={selectedCategory || ''}
              onChange={(value) => setSelectedCategory(value || null)}
              options={categoryOptions}
              placeholder="All Categories"
            />
          )}
        </div>

        {onCaptureNew && (
          <button
            onClick={onCaptureNew}
            className="px-4 py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-neutral-50 text-sm font-medium transition-colors"
          >
            + Capture New
          </button>
        )}
      </div>

      {/* Empty State */}
      {thoughts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">💭</div>
          <h2 className="text-xl font-semibold text-neutral-300 mb-2">
            No thoughts yet
          </h2>
          <p className="text-neutral-500">
            Click "Capture Thought" to start collecting your ideas.
          </p>
        </div>
      )}

      {/* Thoughts List */}
      <div className="space-y-3">
        {thoughts.map((thought) => (
          <div
            key={thought.id}
            className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-700/30 hover:border-ember-500/30 transition-all"
          >
            {editingId === thought.id ? (
              /* Edit Mode */
              <div className="space-y-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full h-24 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-ember-500 resize-none"
                />
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="Category (optional)"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(thought.id)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-ember-500 hover:bg-ember-400 text-neutral-50 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Display Mode */
              <>
                {/* Category Badge */}
                {thought.category && (
                  <div className="mb-2">
                    <span className="inline-block px-2 py-1 text-xs rounded-md bg-ember-500/20 text-ember-400 border border-ember-800/50">
                      {thought.category}
                    </span>
                  </div>
                )}

                {/* Thought Text */}
                <p className="text-neutral-100 text-sm mb-3 whitespace-pre-wrap">
                  {thought.text}
                </p>

                {/* Category-Specific Fields (Article Ideas, Research, App Ideas) */}
                {(thought.category === 'Article Ideas' || thought.category === 'Research' || thought.category === 'App Ideas') && thought.categoryFields && 'metadata' in thought.categoryFields && (
                  <div className="mb-3 p-3 bg-neutral-900/50 rounded-lg border border-neutral-700/30 space-y-2">
                    <div className="text-xs font-medium text-neutral-400 mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-ember-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {thought.category} Details
                    </div>

                    {thought.categoryFields.url && (
                      <div>
                        <span className="text-xs text-neutral-500">URL: </span>
                        <a
                          href={thought.categoryFields.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-ember-400 hover:text-ember-300 transition-colors break-all"
                        >
                          {thought.categoryFields.url}
                        </a>
                      </div>
                    )}

                    {thought.categoryFields.metadata && (
                      <>
                        {thought.categoryFields.metadata.title && (
                          <div>
                            <span className="text-xs text-neutral-500">Title: </span>
                            <span className="text-xs text-neutral-300">{thought.categoryFields.metadata.title}</span>
                          </div>
                        )}

                        {thought.categoryFields.metadata.author && (
                          <div>
                            <span className="text-xs text-neutral-500">Author: </span>
                            <span className="text-xs text-neutral-300">{thought.categoryFields.metadata.author}</span>
                          </div>
                        )}

                        {thought.categoryFields.metadata.siteName && (
                          <div>
                            <span className="text-xs text-neutral-500">Source: </span>
                            <span className="text-xs text-neutral-300">{thought.categoryFields.metadata.siteName}</span>
                          </div>
                        )}

                        {thought.categoryFields.metadata.publishedDate && (
                          <div>
                            <span className="text-xs text-neutral-500">Published: </span>
                            <span className="text-xs text-neutral-300">
                              {new Date(thought.categoryFields.metadata.publishedDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        {thought.categoryFields.metadata.feeds && thought.categoryFields.metadata.feeds.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-neutral-700/30">
                            <div className="text-xs text-neutral-500 mb-1">
                              {thought.categoryFields.metadata.feeds.length === 1 ? 'RSS Feed Found:' : 'RSS Feeds Found:'}
                            </div>
                            {thought.categoryFields.metadata.feeds.map((feed, idx) => (
                              <div key={idx} className="flex items-center gap-2 mt-1">
                                {feed.isSubscribed && (
                                  <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                                <span className="text-xs text-neutral-300 break-all">
                                  {feed.title || feed.url}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Category-Specific Fields (Video Insights) */}
                {thought.category === 'Video Insights' && thought.categoryFields && 'timestamp' in thought.categoryFields && (
                  <div className="mb-3 p-3 bg-neutral-900/50 rounded-lg border border-neutral-700/30 space-y-2">
                    <div className="text-xs font-medium text-neutral-400 mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-ember-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Video Details
                    </div>

                    {thought.categoryFields.url && (
                      <div>
                        <span className="text-xs text-neutral-500">URL: </span>
                        <a
                          href={thought.categoryFields.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-ember-400 hover:text-ember-300 transition-colors break-all"
                        >
                          {thought.categoryFields.url}
                        </a>
                      </div>
                    )}

                    {thought.categoryFields.timestamp && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">Timestamp:</span>
                        <span className="inline-block px-2 py-0.5 text-xs rounded-md bg-ember-500/10 text-ember-400 border border-ember-800/50 font-mono">
                          {thought.categoryFields.timestamp}
                        </span>
                      </div>
                    )}

                    {thought.categoryFields.creator && (
                      <div>
                        <span className="text-xs text-neutral-500">Creator: </span>
                        <span className="text-xs text-neutral-300">{thought.categoryFields.creator}</span>
                      </div>
                    )}

                    {thought.categoryFields.keyQuote && (
                      <div className="mt-2 pt-2 border-t border-neutral-700/30">
                        <div className="text-xs text-neutral-500 mb-1">Key Quote:</div>
                        <blockquote className="text-xs text-neutral-300 italic pl-3 border-l-2 border-ember-500/30">
                          "{thought.categoryFields.keyQuote}"
                        </blockquote>
                      </div>
                    )}
                  </div>
                )}

                {/* Article Association */}
                {thought.article && (
                  <div className="mb-3 p-2 bg-neutral-900/50 rounded-lg border border-neutral-700/30">
                    <div className="text-xs text-neutral-500 mb-1">Related to:</div>
                    <a
                      href={thought.article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-ember-400 hover:text-ember-300 transition-colors line-clamp-1"
                    >
                      {thought.article.title}
                    </a>
                    <div className="text-xs text-neutral-500 mt-1">
                      {thought.article.source}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">
                    {formatTimeAgo(thought.createdAt)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(thought)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteThought(thought.id)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-red-900/20 hover:bg-red-900/30 text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
