'use client'

export type CollectionView = 'journal' | 'recommendations' | 'read-later' | 'topics' | 'thoughts' | 'analytics' | 'settings' | 'news' | 'digest' | 'search' | 'trending' | 'discover'

interface CollectionsLinksProps {
  onNavigate: (view: CollectionView) => void
  activeView?: CollectionView
}

/**
 * Collections Links - Footer navigation for content collections
 *
 * Provides quick access to:
 * - Recommendations
 * - Read Later
 * - By Topic
 * - Thought Collection (placeholder)
 * - Daily Journal
 * - Analytics
 * - Feed Admin
 */
export default function CollectionsLinks({ onNavigate, activeView }: CollectionsLinksProps) {
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
    <div className="glass-medium rounded-2xl p-3 sm:p-5">
      <h2 className="text-base sm:text-lg font-bold text-neutral-50 mb-3">Collections</h2>
      {/* Mobile: horizontal scroll, Desktop: grid */}
      <div className="sm:hidden overflow-x-auto -mx-3 px-3 pb-2 scrollbar-hide">
        <div className="flex gap-2" style={{ width: 'max-content' }}>
          {collections.map((collection) => (
            <button
              key={collection.name}
              onClick={() => onNavigate(collection.view)}
              className={`flex flex-col items-center justify-center min-w-[72px] p-3 rounded-lg
                       border transition-all duration-200 group
                       ${activeView === collection.view
                         ? 'bg-ember-500/20 border-ember-500/50'
                         : 'bg-neutral-800/30 hover:bg-neutral-700/40 border-neutral-700/30 hover:border-ember-500/30'
                       }`}
            >
              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">
                {collection.icon}
              </span>
              <span className={`text-[11px] text-center font-medium leading-tight whitespace-nowrap ${
                activeView === collection.view ? 'text-ember-400' : 'text-neutral-300'
              }`}>
                {collection.name}
              </span>
            </button>
          ))}
        </div>
      </div>
      {/* Desktop: grid layout */}
      <div className="hidden sm:grid grid-cols-4 lg:grid-cols-8 gap-2">
        {collections.map((collection) => (
          <button
            key={collection.name}
            onClick={() => onNavigate(collection.view)}
            className={`flex flex-col items-center justify-center p-3 rounded-lg
                     border transition-all duration-200 group
                     ${activeView === collection.view
                       ? 'bg-ember-500/20 border-ember-500/50'
                       : 'bg-neutral-800/30 hover:bg-neutral-700/40 border-neutral-700/30 hover:border-ember-500/30'
                     }`}
          >
            <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">
              {collection.icon}
            </span>
            <span className={`text-[10px] text-center font-medium leading-tight ${
              activeView === collection.view ? 'text-ember-400' : 'text-neutral-300'
            }`}>
              {collection.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
