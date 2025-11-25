'use client'

import { useState, useEffect } from 'react'

type Feed = {
  id: string
  name: string
  url: string
  type: string
  category: string
  updateFrequency: number
  enabled: boolean
  lastFetched: string | null
}

type Category = 'all' | 'tech' | 'developer' | 'business' | 'science' | 'design'

export default function FeedManagementWidget() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<Category>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddFeed, setShowAddFeed] = useState(false)

  // New feed form state
  const [newFeed, setNewFeed] = useState({
    name: '',
    url: '',
    type: 'rss' as const,
    category: 'tech',
  })

  useEffect(() => {
    fetchFeeds()
  }, [])

  const fetchFeeds = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/trending/feeds')
      if (response.ok) {
        const data = await response.json()
        setFeeds(data.feeds || [])
      }
    } catch (error) {
      console.error('Failed to fetch feeds:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFeed = async (feedId: string, currentState: boolean) => {
    try {
      const response = await fetch('/api/trending/feeds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedId, enabled: !currentState }),
      })

      if (response.ok) {
        // Update local state
        setFeeds(feeds.map(feed =>
          feed.id === feedId ? { ...feed, enabled: !currentState } : feed
        ))
      }
    } catch (error) {
      console.error('Failed to toggle feed:', error)
    }
  }

  const addCustomFeed = async () => {
    if (!newFeed.name || !newFeed.url) return

    try {
      const response = await fetch('/api/trending/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeed),
      })

      if (response.ok) {
        const data = await response.json()
        setFeeds([...feeds, data.feed])
        setNewFeed({ name: '', url: '', type: 'rss', category: 'tech' })
        setShowAddFeed(false)
      }
    } catch (error) {
      console.error('Failed to add feed:', error)
    }
  }

  const filteredFeeds = feeds.filter(feed => {
    const matchesCategory = selectedCategory === 'all' || feed.category === selectedCategory
    const matchesSearch = feed.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         feed.url.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const categories: { value: Category; label: string; count: number }[] = [
    { value: 'all', label: 'All Feeds', count: feeds.length },
    { value: 'tech', label: 'Technology', count: feeds.filter(f => f.category === 'tech').length },
    { value: 'developer', label: 'Developer', count: feeds.filter(f => f.category === 'developer').length },
    { value: 'business', label: 'Business', count: feeds.filter(f => f.category === 'business').length },
    { value: 'science', label: 'Science', count: feeds.filter(f => f.category === 'science').length },
    { value: 'design', label: 'Design', count: feeds.filter(f => f.category === 'design').length },
  ]

  const enabledCount = feeds.filter(f => f.enabled).length

  return (
    <div className="glass-card p-6 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Feed Management</h2>
          <p className="text-sm text-neutral-400">
            {enabledCount} of {feeds.length} feeds enabled
          </p>
        </div>
        <button
          onClick={() => setShowAddFeed(!showAddFeed)}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showAddFeed ? 'Cancel' : 'Add Feed'}
        </button>
      </div>

      {/* Add Feed Form */}
      {showAddFeed && (
        <div className="mb-6 p-4 bg-neutral-800/30 rounded-lg border border-emerald-500/30">
          <h3 className="text-lg font-semibold text-white mb-4">Add Custom Feed</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Feed name"
              value={newFeed.name}
              onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-emerald-500 focus:outline-none"
            />
            <input
              type="url"
              placeholder="Feed URL"
              value={newFeed.url}
              onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-emerald-500 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newFeed.type}
                onChange={(e) => setNewFeed({ ...newFeed, type: e.target.value as any })}
                className="px-4 py-2 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="rss">RSS</option>
                <option value="reddit">Reddit</option>
                <option value="hackernews">Hacker News</option>
                <option value="substack">Substack</option>
                <option value="medium">Medium</option>
              </select>
              <select
                value={newFeed.category}
                onChange={(e) => setNewFeed({ ...newFeed, category: e.target.value })}
                className="px-4 py-2 bg-neutral-800 text-white rounded-lg border border-neutral-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="tech">Technology</option>
                <option value="developer">Developer</option>
                <option value="business">Business</option>
                <option value="science">Science</option>
                <option value="design">Design</option>
              </select>
            </div>
            <button
              onClick={addCustomFeed}
              className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
            >
              Add Feed
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search feeds..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-neutral-800/30 text-white rounded-lg border border-neutral-700 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.value}
            onClick={() => setSelectedCategory(category.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === category.value
                ? 'bg-emerald-500 text-white'
                : 'bg-neutral-800/30 text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            {category.label} ({category.count})
          </button>
        ))}
      </div>

      {/* Feed List */}
      {loading ? (
        <div className="text-center py-12 text-neutral-400">
          Loading feeds...
        </div>
      ) : filteredFeeds.length === 0 ? (
        <div className="text-center py-12 text-neutral-400">
          No feeds found
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFeeds.map((feed) => (
            <div
              key={feed.id}
              className="p-4 bg-neutral-800/20 rounded-lg hover:bg-neutral-800/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-white">{feed.name}</h3>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                      {feed.type}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                      {feed.category}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-400 truncate max-w-2xl">
                    {feed.url}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                    <span>Updates every {feed.updateFrequency}min</span>
                    {feed.lastFetched && (
                      <span>Last fetched: {new Date(feed.lastFetched).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleFeed(feed.id, feed.enabled)}
                  className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    feed.enabled
                      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                      : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                  }`}
                >
                  {feed.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-6 pt-4 border-t border-neutral-700/50 flex justify-between text-sm text-neutral-400">
        <span>Showing {filteredFeeds.length} feeds</span>
        <button
          onClick={fetchFeeds}
          className="text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
