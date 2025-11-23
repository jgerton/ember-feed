'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface LogEntry {
  id: string
  type: 'discovery' | 'blocker' | 'accomplishment' | 'thought'
  content: string
  tags: string[]
  createdAt: string
}

const TYPE_COLORS = {
  discovery: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  blocker: 'bg-red-500/20 text-red-300 border border-red-500/30',
  accomplishment: 'bg-green-500/20 text-green-300 border border-green-500/30',
  thought: 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
}

const TYPE_ICONS = {
  discovery: '💡',
  blocker: '🚧',
  accomplishment: '🎉',
  thought: '💭'
}

export default function DeveloperJournal() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<LogEntry['type']>('thought')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [filter, setFilter] = useState<'all' | LogEntry['type']>('all')
  const [saving, setSaving] = useState(false)

  const fetchEntries = async () => {
    try {
      const url = filter === 'all' ? '/api/log' : `/api/log?type=${filter}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch entries')
      const data = await res.json()
      setEntries(data)
    } catch (error) {
      console.error('Error fetching log entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setSaving(true)
    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t)

      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          content: content.trim(),
          tags: tagArray.length > 0 ? tagArray : undefined
        })
      })

      if (!res.ok) throw new Error('Failed to create entry')

      setContent('')
      setTags('')
      await fetchEntries()
    } catch (error) {
      console.error('Error creating entry:', error)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [filter])

  if (loading) {
    return <div className="p-4 text-neutral-400">Loading journal...</div>
  }

  return (
    <div className="glass-medium rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-neutral-50 mb-6">Developer Journal</h2>

      {/* Entry Form */}
      <form onSubmit={handleSubmit} className="mb-6 p-4 glass-light rounded-lg">
        <div className="flex gap-2 mb-3 flex-wrap">
          {(['thought', 'discovery', 'blocker', 'accomplishment'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                type === t
                  ? TYPE_COLORS[t]
                  : 'bg-neutral-700/50 text-neutral-300 hover:bg-neutral-700/70'
              }`}
            >
              {TYPE_ICONS[t]} {t}
            </button>
          ))}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full p-3 bg-neutral-800/50 border border-white/10 text-neutral-50 placeholder-neutral-500 rounded-lg mb-3 min-h-[100px] focus:ring-2 focus:ring-ember-500 focus:border-ember-500 transition-colors"
        />

        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags (comma separated)"
          className="w-full p-2 bg-neutral-800/50 border border-white/10 text-neutral-50 placeholder-neutral-500 rounded-lg mb-3 focus:ring-2 focus:ring-ember-500 focus:border-ember-500 transition-colors"
        />

        <button
          type="submit"
          disabled={saving || !content.trim()}
          className="px-4 py-2 bg-ember-600 text-white rounded-lg hover:bg-ember-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Add Entry'}
        </button>
      </form>

      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
            filter === 'all'
              ? 'bg-ember-600 text-white'
              : 'bg-neutral-700/50 text-neutral-300 hover:bg-neutral-700/70'
          }`}
        >
          All ({entries.length})
        </button>
        {(['thought', 'discovery', 'blocker', 'accomplishment'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
              filter === t
                ? TYPE_COLORS[t]
                : 'bg-neutral-700/50 text-neutral-300 hover:bg-neutral-700/70'
            }`}
          >
            {TYPE_ICONS[t]} {t}
          </button>
        ))}
      </div>

      {/* Entries Timeline */}
      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-neutral-400">
            No entries yet. Start journaling!
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-lg p-4 ${TYPE_COLORS[entry.type]}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{TYPE_ICONS[entry.type]}</span>
                  <span className="font-semibold capitalize">{entry.type}</span>
                </div>
                <span className="text-xs opacity-75">
                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </span>
              </div>

              <p className="text-sm mb-2 whitespace-pre-wrap">{entry.content}</p>

              {entry.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {entry.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-white/10 rounded text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
