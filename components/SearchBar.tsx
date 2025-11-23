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

interface SearchFilters {
  query: string
  topic: string
  source: string
  minScore: number
  maxScore: number
  startDate: string
  endDate: string
  sortBy: 'relevance' | 'date' | 'score'
}

interface SearchBarProps {
  onResults?: (articles: Article[], totalCount: number) => void
}

export default function SearchBar({ onResults }: SearchBarProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    topic: '',
    source: '',
    minScore: 0,
    maxScore: 100,
    startDate: '',
    endDate: '',
    sortBy: 'relevance'
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Article[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [topics, setTopics] = useState<Topic[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [savedArticles, setSavedArticles] = useState<Set<string>>(new Set())

  // Fetch available topics and sources on mount
  useEffect(() => {
    fetchTopics()
    fetchSources()
    fetchSavedArticles()
  }, [])

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/topics')
      if (!res.ok) return
      const data = await res.json()
      setTopics(data.topics || [])
    } catch (error) {
      console.error('Error fetching topics:', error)
    }
  }

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/articles?limit=100')
      if (!res.ok) return
      const data = await res.json()
      const articles = data.articles || []
      const uniqueSources = [...new Set(articles.map((a: Article) => a.source))] as string[]
      setSources(uniqueSources.sort())
    } catch (error) {
      console.error('Error fetching sources:', error)
    }
  }

  const fetchSavedArticles = async () => {
    try {
      const res = await fetch('/api/saved-articles')
      if (!res.ok) return
      const saved = await res.json()
      const savedIds = new Set(saved.map((s: any) => s.articleId))
      setSavedArticles(savedIds)
    } catch (error) {
      console.error('Error fetching saved articles:', error)
    }
  }

  // Toggle save/unsave article
  const toggleSave = async (articleId: string) => {
    const isSaved = savedArticles.has(articleId)

    // Optimistic UI update
    setSavedArticles(prev => {
      const newSet = new Set(prev)
      if (isSaved) {
        newSet.delete(articleId)
      } else {
        newSet.add(articleId)
      }
      return newSet
    })

    try {
      if (isSaved) {
        // Find the saved article record to get its ID
        const res = await fetch('/api/saved-articles')
        if (res.ok) {
          const savedList = await res.json()
          const savedArticle = savedList.find((s: any) => s.articleId === articleId)
          if (savedArticle) {
            await fetch(`/api/saved-articles/${savedArticle.id}`, {
              method: 'DELETE'
            })
          }
        }
      } else {
        // Save the article
        await fetch('/api/saved-articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId })
        })
      }
    } catch (error) {
      console.error('Error toggling save:', error)
      // Revert optimistic update on error
      setSavedArticles(prev => {
        const newSet = new Set(prev)
        if (isSaved) {
          newSet.add(articleId)
        } else {
          newSet.delete(articleId)
        }
        return newSet
      })
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)

    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.append('q', searchQuery.trim())
      if (filters.topic) params.append('topic', filters.topic)
      if (filters.source) params.append('source', filters.source)
      if (filters.minScore > 0) params.append('minScore', filters.minScore.toString())
      if (filters.maxScore < 100) params.append('maxScore', filters.maxScore.toString())
      if (filters.startDate) params.append('startDate', new Date(filters.startDate).toISOString())
      if (filters.endDate) params.append('endDate', new Date(filters.endDate).toISOString())
      if (searchQuery.trim() && filters.sortBy) params.append('sort', filters.sortBy)

      const res = await fetch(`/api/search?${params.toString()}`)
      if (!res.ok) throw new Error('Search failed')

      const data = await res.json()
      setResults(data.results)
      setTotalCount(data.total)

      // Notify parent component if callback provided
      if (onResults) {
        onResults(data.results, data.total)
      }
    } catch (error) {
      console.error('Error searching articles:', error)
      setResults([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSearchQuery('')
    setFilters({
      query: '',
      topic: '',
      source: '',
      minScore: 0,
      maxScore: 100,
      startDate: '',
      endDate: '',
      sortBy: 'relevance'
    })
    setResults([])
    setTotalCount(0)
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

  // Highlight matching text in search results
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text

    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))

    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={index}
              className="bg-ember-500/30 text-ember-300 rounded px-0.5"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        {/* Main Search Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles by title, description, or source..."
            className="flex-1 px-4 py-2 rounded-lg bg-neutral-800 text-neutral-100 placeholder-neutral-500 border border-neutral-700 focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20 transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-ember-600 hover:bg-ember-700 disabled:bg-neutral-700 text-white font-medium transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
          >
            {showAdvanced ? 'Hide' : 'Filters'}
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="glass-light rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-300 mb-3">Advanced Filters</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Topic Filter */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Topic</label>
                <select
                  value={filters.topic}
                  onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 text-neutral-100 border border-neutral-700 focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20 transition-colors text-sm"
                >
                  <option value="">All Topics</option>
                  {topics.map((topic) => (
                    <option key={topic.slug} value={topic.slug}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Filter */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Source</label>
                <select
                  value={filters.source}
                  onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 text-neutral-100 border border-neutral-700 focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20 transition-colors text-sm"
                >
                  <option value="">All Sources</option>
                  {sources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              {/* Score Range */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Score Range: {filters.minScore} - {filters.maxScore}
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.minScore}
                    onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) || 0 })}
                    className="w-20 px-2 py-1 rounded-lg bg-neutral-800 text-neutral-100 border border-neutral-700 focus:border-ember-500 focus:outline-none text-sm"
                  />
                  <span className="text-neutral-500">to</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.maxScore}
                    onChange={(e) => setFilters({ ...filters, maxScore: parseInt(e.target.value) || 100 })}
                    className="w-20 px-2 py-1 rounded-lg bg-neutral-800 text-neutral-100 border border-neutral-700 focus:border-ember-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 text-neutral-100 border border-neutral-700 focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20 transition-colors text-sm"
                >
                  <option value="relevance">Relevance</option>
                  <option value="date">Date (Newest)</option>
                  <option value="score">Score (Highest)</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 text-neutral-100 border border-neutral-700 focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20 transition-colors text-sm"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-800 text-neutral-100 border border-neutral-700 focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20 transition-colors text-sm"
                />
              </div>
            </div>

            {/* Reset Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-1.5 text-sm rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Search Results */}
      {totalCount > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-neutral-400">
            Found {totalCount} {totalCount === 1 ? 'article' : 'articles'}
          </div>

          <div className="space-y-3">
            {results.map((article) => (
              <article
                key={article.id}
                className="glass-light rounded-xl p-4 hover:glass-medium transition-all duration-200 cursor-pointer group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-neutral-50 group-hover:text-ember-400 transition-colors mb-1">
                      {highlightText(article.title, searchQuery)}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <span className="text-ember-500 font-medium">
                        {highlightText(article.source, searchQuery)}
                      </span>
                      <span>•</span>
                      <span>{formatTimeAgo(article.publishedAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center ml-3">
                    <div className="text-xl font-bold text-ember-500">{article.score}</div>
                    <div className="text-xs text-neutral-500">score</div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-neutral-300 text-sm leading-relaxed mb-3">
                  {highlightText(article.description, searchQuery)}
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

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    Read More →
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSave(article.id)
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      savedArticles.has(article.id)
                        ? 'bg-ember-500/20 hover:bg-ember-500/30 text-ember-400'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    }`}
                  >
                    {savedArticles.has(article.id) ? '📌 Saved' : '🔖 Save for Later'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {!loading && totalCount === 0 && searchQuery && (
        <div className="text-center py-8 text-neutral-500">
          No articles found matching your search criteria.
        </div>
      )}
    </div>
  )
}
