'use client'

import { useEffect, useState } from 'react'

interface Article {
  id: string
  title: string
  description: string
  url: string
  source: string
  score: number
  publishedAt: string
  topics?: Array<{
    topic: {
      name: string
      slug: string
    }
  }>
}

interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: string
}

interface LogEntry {
  id: string
  type: string
  content: string
  createdAt: string
}

interface TrendingTopic {
  slug: string
  name: string
  count: number
}

interface DigestData {
  date: string
  topArticles: Article[]
  unreadTodos: Todo[]
  logs: {
    discoveries: LogEntry[]
    accomplishments: LogEntry[]
    blockers: LogEntry[]
    thoughts: LogEntry[]
  }
  trendingTopics: TrendingTopic[]
  stats: {
    newArticles: number
    unreadTodoCount: number
    logEntryCount: number
  }
}

export default function DailyDigest() {
  const [digest, setDigest] = useState<DigestData | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDigest = async () => {
      try {
        const res = await fetch('/api/digest')
        if (!res.ok) throw new Error('Failed to fetch digest')
        const data = await res.json()
        setDigest(data)
      } catch (e) {
        console.error('Failed to load digest:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchDigest()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-neutral-700 rounded w-1/4 mb-4"></div>
        <div className="h-24 bg-neutral-700 rounded"></div>
      </div>
    )
  }

  if (!digest) return null

  const hasContent = digest.topArticles.length > 0 ||
                     digest.unreadTodos.length > 0 ||
                     digest.logs.discoveries.length > 0 ||
                     digest.logs.accomplishments.length > 0

  if (!hasContent) return null

  return (
    <div className="glass-light rounded-2xl p-6">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-50 flex items-center gap-2">
            Daily Digest
            <span className="text-lg text-neutral-400">
              {new Date(digest.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            {digest.stats.newArticles} new articles • {digest.stats.unreadTodoCount} tasks • {digest.stats.logEntryCount} log entries
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-neutral-400 hover:text-neutral-200 transition-colors"
          aria-label={isExpanded ? 'Collapse digest' : 'Expand digest'}
        >
          <svg
            className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* Top Articles */}
          {digest.topArticles.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-ember-400 mb-3">Top Stories Today</h3>
              <div className="space-y-2">
                {digest.topArticles.map((article, idx) => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block glass-medium rounded-lg p-3 hover:glass-light transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-ember-500 font-bold text-lg">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-neutral-100 font-medium group-hover:text-ember-400 transition-colors line-clamp-2">
                          {article.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                          <span>{article.source}</span>
                          <span>•</span>
                          <span>Score: {article.score}</span>
                          {article.topics && article.topics.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-ember-500">{article.topics[0].topic.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Unread Todos */}
          {digest.unreadTodos.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-ember-400 mb-3">Tasks Waiting</h3>
              <div className="space-y-2">
                {digest.unreadTodos.slice(0, 3).map(todo => (
                  <div key={todo.id} className="flex items-center gap-2 text-neutral-300">
                    <span className="text-neutral-500">□</span>
                    <span className="line-clamp-1">{todo.text}</span>
                  </div>
                ))}
                {digest.unreadTodos.length > 3 && (
                  <a href="#quick-tasks" className="text-sm text-ember-500 hover:text-ember-400">
                    +{digest.unreadTodos.length - 3} more tasks →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Recent Discoveries & Accomplishments */}
          {(digest.logs.discoveries.length > 0 || digest.logs.accomplishments.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {digest.logs.discoveries.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-blue-400 mb-2">Discoveries</h3>
                  <div className="space-y-2">
                    {digest.logs.discoveries.slice(0, 2).map(log => (
                      <div key={log.id} className="text-sm text-neutral-300 line-clamp-2">
                        💡 {log.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {digest.logs.accomplishments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-green-400 mb-2">Accomplishments</h3>
                  <div className="space-y-2">
                    {digest.logs.accomplishments.slice(0, 2).map(log => (
                      <div key={log.id} className="text-sm text-neutral-300 line-clamp-2">
                        ✓ {log.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trending Topics */}
          {digest.trendingTopics.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-ember-400 mb-2">Trending Topics</h3>
              <div className="flex flex-wrap gap-2">
                {digest.trendingTopics.map(topic => (
                  <a
                    key={topic.slug}
                    href={`/?topic=${topic.slug}`}
                    className="glass-medium px-3 py-1 rounded-full text-sm hover:glass-light transition-all"
                  >
                    <span className="text-neutral-200">{topic.name}</span>
                    <span className="text-ember-500 ml-1">({topic.count})</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
