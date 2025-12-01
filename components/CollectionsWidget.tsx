'use client'

import { useState } from 'react'

export type CollectionView = 'journal' | 'recommendations' | 'read-later' | 'topics' | 'thoughts' | 'analytics' | 'settings' | 'news' | 'digest' | 'search' | 'trending' | 'discover'

interface CollectionsWidgetProps {
  onNavigate: (view: CollectionView) => void
  activeView?: CollectionView
}

/**
 * Collections Widget
 *
 * Collapsible sidebar widget for navigating content collections:
 * - Daily Journal, Recommendations, Discover, Read Later
 * - Thoughts, By Topic, Trending, All News
 * - Analytics, Feed Admin
 */
export default function CollectionsWidget({ onNavigate, activeView }: CollectionsWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const collections = [
    { name: 'Daily Journal', view: 'journal' as CollectionView, icon: '📝' },
    { name: 'Recommendations', view: 'recommendations' as CollectionView, icon: '⭐' },
    { name: 'Discover', view: 'discover' as CollectionView, icon: '🔍' },
    { name: 'Read Later', view: 'read-later' as CollectionView, icon: '📚' },
    { name: 'Thoughts', view: 'thoughts' as CollectionView, icon: '💭' },
    { name: 'By Topic', view: 'topics' as CollectionView, icon: '🏷️' },
    { name: 'Trending', view: 'trending' as CollectionView, icon: '🔥' },
    { name: 'All News', view: 'news' as CollectionView, icon: '📰' },
    { name: 'Analytics', view: 'analytics' as CollectionView, icon: '📊' },
  ]

  return (
    <div className="glass-light rounded-xl overflow-hidden">
      {/* Header - Always Visible */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:text-ember-400 transition-colors flex-1"
        >
          <span className="text-lg">📁</span>
          <h3 className="text-base font-semibold text-neutral-100">Collections</h3>
          <svg
            className={`w-4 h-4 text-neutral-500 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 space-y-1 max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent hover:scrollbar-thumb-neutral-600">
          {collections.map((collection) => (
            <button
              key={collection.name}
              onClick={() => onNavigate(collection.view)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200
                ${activeView === collection.view
                  ? 'bg-ember-500/20 border-ember-500/50'
                  : 'bg-neutral-800/30 hover:bg-neutral-700/40'
                } border border-neutral-700/30 hover:border-ember-500/30`}
            >
              <span className="text-lg">{collection.icon}</span>
              <span className={`text-sm font-medium ${
                activeView === collection.view ? 'text-ember-400' : 'text-neutral-300'
              }`}>
                {collection.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
