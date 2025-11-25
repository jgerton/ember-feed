'use client'

import { useState, useEffect } from 'react'

interface TopicArticle {
  title: string
  url: string
  source: string
}

interface Topic {
  rank: number
  keyword: string
  score: number
  mentions: number
  summary: string
  sources: string[]
  sample_articles: TopicArticle[]
  fetched_at: string
}

interface TopicsViewProps {
  selectedTopic?: string | null
  onTopicChange?: (topic: string | null) => void
}

/**
 * Topics View - Browse articles by trending topic
 *
 * Displays trending topics as filterable chips with their related articles.
 */
export default function TopicsView({ selectedTopic, onTopicChange }: TopicsViewProps) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | null>(selectedTopic || null)

  useEffect(() => {
    fetchTopics()
  }, [])

  useEffect(() => {
    if (selectedTopic !== undefined) {
      setActiveFilter(selectedTopic)
    }
  }, [selectedTopic])

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/trending/hot?timeframe=24hr&limit=10')
      if (response.ok) {
        const data = await response.json()
        setTopics(data.topics || [])
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterClick = (keyword: string | null) => {
    setActiveFilter(keyword)
    onTopicChange?.(keyword)
  }

  // Get articles to display based on filter
  const getDisplayArticles = (): TopicArticle[] => {
    if (!activeFilter) {
      // Show all articles from all topics (deduplicated by URL)
      const seen = new Set<string>()
      const allArticles: TopicArticle[] = []
      for (const topic of topics) {
        for (const article of topic.sample_articles) {
          if (!seen.has(article.url)) {
            seen.add(article.url)
            allArticles.push(article)
          }
        }
      }
      return allArticles
    }

    // Find the topic and return its articles
    const topic = topics.find(t => t.keyword.toLowerCase() === activeFilter.toLowerCase())
    return topic?.sample_articles || []
  }

  const displayArticles = getDisplayArticles()
  const activeTopic = activeFilter
    ? topics.find(t => t.keyword.toLowerCase() === activeFilter.toLowerCase())
    : null

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-24 bg-neutral-800/30 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-neutral-800/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-400 text-lg mb-2">No trending topics yet</p>
        <p className="text-neutral-500 text-sm">Topics will appear as content is aggregated</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Topic Filter Chips */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleFilterClick(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === null
              ? 'bg-ember-500 text-neutral-50'
              : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50 hover:text-neutral-100'
          }`}
        >
          All Topics
        </button>
        {topics.map((topic) => (
          <button
            key={topic.keyword}
            onClick={() => handleFilterClick(topic.keyword)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              activeFilter?.toLowerCase() === topic.keyword.toLowerCase()
                ? 'bg-ember-500 text-neutral-50'
                : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50 hover:text-neutral-100'
            }`}
          >
            <span className="capitalize">{topic.keyword}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeFilter?.toLowerCase() === topic.keyword.toLowerCase()
                ? 'bg-ember-600/50'
                : 'bg-neutral-700/50'
            }`}>
              {topic.mentions}
            </span>
          </button>
        ))}
      </div>

      {/* Topic Summary (when filtered) */}
      {activeTopic && (
        <div className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-700/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-neutral-100 capitalize">
              {activeTopic.keyword}
            </h3>
            <span className="text-sm text-neutral-400">
              #{activeTopic.rank} trending
            </span>
          </div>
          <p className="text-neutral-400 text-sm">
            {activeTopic.mentions} mentions across {activeTopic.sources.join(', ')}
          </p>
        </div>
      )}

      {/* Articles List */}
      <div className="space-y-3">
        {displayArticles.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-400">No articles found for this topic</p>
          </div>
        ) : (
          displayArticles.map((article, index) => (
            <a
              key={`${article.url}-${index}`}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-xl bg-neutral-800/30 border border-neutral-700/30
                       hover:bg-neutral-700/40 hover:border-ember-500/30
                       transition-all duration-200 group"
            >
              <h4 className="text-neutral-100 font-medium group-hover:text-ember-400 transition-colors mb-2">
                {article.title}
              </h4>
              <div className="flex items-center gap-3 text-sm text-neutral-400">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2" />
                  </svg>
                  {article.source}
                </span>
                <span className="flex items-center gap-1 text-ember-400/70">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open
                </span>
              </div>
            </a>
          ))
        )}
      </div>

      {/* Stats Footer */}
      <div className="text-center text-sm text-neutral-500 pt-4 border-t border-neutral-800">
        {activeFilter
          ? `Showing ${displayArticles.length} articles for "${activeFilter}"`
          : `Showing ${displayArticles.length} articles across ${topics.length} trending topics`
        }
      </div>
    </div>
  )
}
