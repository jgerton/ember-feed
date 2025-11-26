'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DiscoverArticle {
  id: string
  title: string
  author: string
  source: string
  url: string
  description?: string
  published_at: string
  engagement_score: number
  platform: string
}

interface Author {
  name: string
  platform: string
  url?: string
  feedUrl?: string
  description?: string
}

interface DetectionResult {
  platform: string
  author?: string
  feedUrl?: string
  profileUrl?: string
  detected: boolean
  message?: string
}

const CATEGORIES = [
  { id: 'technology', label: 'Technology' },
  { id: 'programming', label: 'Programming' },
  { id: 'startup', label: 'Startups' },
  { id: 'ai', label: 'AI/ML' },
  { id: 'business', label: 'Business' },
]

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function getPlatformColor(platform: string): string {
  switch (platform?.toLowerCase()) {
    case 'substack':
      return 'text-orange-400'
    case 'medium':
      return 'text-green-400'
    case 'twitter':
      return 'text-blue-400'
    default:
      return 'text-neutral-400'
  }
}

function getPlatformIcon(platform: string): string {
  switch (platform?.toLowerCase()) {
    case 'substack':
      return 'S'
    case 'medium':
      return 'M'
    case 'twitter':
      return 'X'
    default:
      return 'R'
  }
}

export default function DiscoverPage() {
  // State for trending content
  const [articles, setArticles] = useState<DiscoverArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('technology')

  // State for author search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Author[]>([])
  const [searching, setSearching] = useState(false)
  const [searchPlatform, setSearchPlatform] = useState('all')

  // State for URL detection
  const [urlInput, setUrlInput] = useState('')
  const [detection, setDetection] = useState<DetectionResult | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addMessage, setAddMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Active tab
  const [activeTab, setActiveTab] = useState<'trending' | 'search' | 'add'>('trending')

  // Fetch trending content
  useEffect(() => {
    fetchTrending()
  }, [selectedCategory])

  const fetchTrending = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/discover?categories=${selectedCategory}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setArticles(data.articles || [])
      }
    } catch (error) {
      console.error('Error fetching trending:', error)
    } finally {
      setLoading(false)
    }
  }

  // Search authors
  const handleSearch = async () => {
    if (searchQuery.length < 2) return

    setSearching(true)
    try {
      const res = await fetch(
        `/api/authors/search?name=${encodeURIComponent(searchQuery)}&platform=${searchPlatform}`
      )
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.results || [])
      }
    } catch (error) {
      console.error('Error searching authors:', error)
    } finally {
      setSearching(false)
    }
  }

  // Detect URL
  const handleDetect = async () => {
    if (!urlInput.trim()) return

    setDetecting(true)
    setDetection(null)
    setAddMessage(null)

    try {
      const res = await fetch('/api/feeds/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setDetection(data)
      }
    } catch (error) {
      console.error('Error detecting URL:', error)
    } finally {
      setDetecting(false)
    }
  }

  // Add feed from URL
  const handleAddFeed = async () => {
    if (!detection?.feedUrl) return

    setAdding(true)
    setAddMessage(null)

    try {
      const res = await fetch('/api/feeds/add-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: detection.feedUrl }),
      })
      const data = await res.json()

      if (data.success) {
        if (data.already_exists) {
          setAddMessage({ type: 'success', text: `Feed already exists: ${data.feed.name}` })
        } else {
          setAddMessage({ type: 'success', text: `Added: ${data.feed.name}` })
        }
        setUrlInput('')
        setDetection(null)
      } else {
        setAddMessage({ type: 'error', text: data.error || 'Failed to add feed' })
      }
    } catch (error) {
      setAddMessage({ type: 'error', text: 'Failed to add feed' })
    } finally {
      setAdding(false)
    }
  }

  // Quick add author as feed
  const handleQuickAdd = async (author: Author) => {
    if (!author.feedUrl) return

    try {
      const res = await fetch('/api/feeds/add-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: author.feedUrl }),
      })
      const data = await res.json()

      if (data.success) {
        alert(data.already_exists ? `Feed already exists: ${data.feed.name}` : `Added: ${data.feed.name}`)
      } else {
        alert(data.error || 'Failed to add feed')
      }
    } catch (error) {
      alert('Failed to add feed')
    }
  }

  return (
    <main className="min-h-screen glass-background p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Link
                href="/"
                className="text-ember-500 hover:text-ember-400 transition-colors text-sm mb-2 inline-block"
              >
                ← Back to Feed
              </Link>
              <h1 className="text-4xl font-bold text-ember-500">Discover</h1>
              <p className="text-neutral-400 mt-2">
                Find new authors and content from Substack, Medium, and more
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="glass-light rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setActiveTab('trending')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                activeTab === 'trending'
                  ? 'bg-ember-500 text-neutral-50'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Trending
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                activeTab === 'search'
                  ? 'bg-ember-500 text-neutral-50'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Search Authors
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                activeTab === 'add'
                  ? 'bg-ember-500 text-neutral-50'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Add by URL
            </button>
          </div>
        </header>

        {/* Trending Tab */}
        {activeTab === 'trending' && (
          <div>
            {/* Category Filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg transition-all text-sm ${
                    selectedCategory === cat.id
                      ? 'bg-ember-500 text-neutral-50'
                      : 'glass-medium text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Articles List */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass-medium rounded-xl p-6 animate-pulse">
                    <div className="h-6 bg-neutral-700 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-neutral-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="glass-light rounded-2xl p-12 text-center">
                <p className="text-neutral-400 text-lg mb-2">No trending content found</p>
                <p className="text-neutral-500 text-sm">
                  Try a different category or check back later
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article, index) => (
                  <article
                    key={article.id || index}
                    className="glass-medium rounded-xl p-6 hover:glass-light transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Platform Icon */}
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${getPlatformColor(
                          article.platform
                        )} bg-neutral-800`}
                      >
                        {getPlatformIcon(article.platform)}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <h2 className="text-lg font-semibold text-neutral-50 mb-1 group-hover:text-ember-400 transition-colors">
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {article.title}
                          </a>
                        </h2>

                        {/* Description */}
                        {article.description && (
                          <p className="text-sm text-neutral-400 line-clamp-2 mb-2">
                            {article.description}
                          </p>
                        )}

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                          <span className={getPlatformColor(article.platform)}>
                            {article.author || article.source}
                          </span>
                          <span>•</span>
                          <span>{formatTimeAgo(article.published_at)}</span>
                          {article.engagement_score > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-yellow-400">
                                {article.engagement_score} engagement
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div>
            {/* Search Form */}
            <div className="glass-light rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search for authors..."
                  className="flex-1 px-4 py-2 bg-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500"
                />
                <select
                  value={searchPlatform}
                  onChange={(e) => setSearchPlatform(e.target.value)}
                  className="px-4 py-2 bg-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-ember-500"
                >
                  <option value="all">All Platforms</option>
                  <option value="substack">Substack</option>
                  <option value="medium">Medium</option>
                </select>
                <button
                  onClick={handleSearch}
                  disabled={searching || searchQuery.length < 2}
                  className="px-6 py-2 bg-ember-500 hover:bg-ember-400 disabled:bg-neutral-700 text-neutral-50 rounded-lg transition-colors"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((author, index) => (
                  <div
                    key={index}
                    className="glass-medium rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${getPlatformColor(
                          author.platform
                        )} bg-neutral-800`}
                      >
                        {getPlatformIcon(author.platform)}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-100">{author.name}</p>
                        <p className="text-xs text-neutral-500">{author.platform}</p>
                      </div>
                    </div>
                    {author.feedUrl && (
                      <button
                        onClick={() => handleQuickAdd(author)}
                        className="px-4 py-2 glass-light hover:bg-ember-500 text-neutral-300 hover:text-neutral-50 rounded-lg transition-all text-sm"
                      >
                        + Add Feed
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-light rounded-2xl p-12 text-center">
                <p className="text-neutral-400 text-lg mb-2">Search for authors</p>
                <p className="text-neutral-500 text-sm">
                  Find writers on Substack and Medium by name
                </p>
              </div>
            )}
          </div>
        )}

        {/* Add by URL Tab */}
        {activeTab === 'add' && (
          <div>
            {/* URL Input */}
            <div className="glass-light rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-neutral-100 mb-4">
                Add Feed from URL
              </h3>
              <p className="text-neutral-400 text-sm mb-4">
                Paste a URL from Substack, Medium, Twitter/X, Dev.to, or any RSS feed
              </p>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDetect()}
                  placeholder="https://author.substack.com or medium.com/@author"
                  className="flex-1 px-4 py-3 bg-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500"
                />
                <button
                  onClick={handleDetect}
                  disabled={detecting || !urlInput.trim()}
                  className="px-6 py-3 bg-ember-500 hover:bg-ember-400 disabled:bg-neutral-700 text-neutral-50 rounded-lg transition-colors"
                >
                  {detecting ? 'Detecting...' : 'Detect'}
                </button>
              </div>

              {/* Detection Result */}
              {detection && (
                <div className="mt-4 p-4 bg-neutral-800 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${getPlatformColor(
                        detection.platform
                      )} bg-neutral-700`}
                    >
                      {getPlatformIcon(detection.platform)}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-100">
                        {detection.author || 'Unknown Author'}
                      </p>
                      <p className="text-xs text-neutral-500 capitalize">
                        {detection.platform}
                      </p>
                    </div>
                  </div>

                  {detection.message && (
                    <p className="text-sm text-neutral-400 mb-3">{detection.message}</p>
                  )}

                  {detection.feedUrl && (
                    <div className="mb-3">
                      <p className="text-xs text-neutral-500 mb-1">Feed URL:</p>
                      <code className="text-xs text-ember-400 break-all">
                        {detection.feedUrl}
                      </code>
                    </div>
                  )}

                  {detection.detected && detection.feedUrl && (
                    <button
                      onClick={handleAddFeed}
                      disabled={adding}
                      className="w-full px-4 py-2 bg-ember-500 hover:bg-ember-400 disabled:bg-neutral-700 text-neutral-50 rounded-lg transition-colors"
                    >
                      {adding ? 'Adding...' : 'Add This Feed'}
                    </button>
                  )}
                </div>
              )}

              {/* Add Message */}
              {addMessage && (
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    addMessage.type === 'success'
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {addMessage.text}
                </div>
              )}
            </div>

            {/* Supported Platforms */}
            <div className="glass-medium rounded-xl p-6">
              <h3 className="text-sm font-semibold text-neutral-400 mb-4 uppercase tracking-wide">
                Supported Platforms
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { name: 'Substack', example: 'author.substack.com' },
                  { name: 'Medium', example: 'medium.com/@author' },
                  { name: 'Twitter/X', example: 'twitter.com/user' },
                  { name: 'Dev.to', example: 'dev.to/username' },
                  { name: 'Hashnode', example: 'blog.hashnode.dev' },
                  { name: 'RSS', example: 'site.com/feed' },
                ].map((platform) => (
                  <div key={platform.name} className="p-3 bg-neutral-800/50 rounded-lg">
                    <p className="font-medium text-neutral-200 text-sm">{platform.name}</p>
                    <p className="text-xs text-neutral-500">{platform.example}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
