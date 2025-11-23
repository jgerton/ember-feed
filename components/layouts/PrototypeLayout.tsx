'use client'

import { useState } from 'react'
import NewsWidget from '@/components/NewsWidget'
import TodaysPriorities from '@/components/TodaysPriorities'
import TrendingTopics from '@/components/TrendingTopics'
import CollectionsLinks, { CollectionView } from '@/components/CollectionsLinks'
import DailyDigest from '@/components/DailyDigest'
import DailySummary from '@/components/DailySummary'
import SearchBar from '@/components/SearchBar'
import DeveloperJournal from '@/components/DeveloperJournal'
import FeedAdmin from '@/components/FeedAdmin'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'
import RecommendationsView from '@/components/views/RecommendationsView'
import ReadLaterView from '@/components/views/ReadLaterView'
import ThoughtsView from '@/components/views/ThoughtsView'
import DailySummaryBar from '@/components/DailySummaryBar'
import QuickActions from '@/components/QuickActions'
import TasksWidget from '@/components/TasksWidget'
import ThoughtCaptureModal from '@/components/ThoughtCaptureModal'

/**
 * Prototype Layout - Matches the design from docs/images/prototype-layout.png
 *
 * Layout Structure:
 * - Header: Branding + System Health (already in page.tsx)
 * - Main Area (70%): Dynamic content that changes based on user selection
 * - Right Sidebar (30%): Today's Priorities, Ranked News, Trending Topics
 * - Footer: Collections Links navigation
 */
export default function PrototypeLayout() {
  const [mainContent, setMainContent] = useState<CollectionView>('digest')
  const [isNewsExpanded, setIsNewsExpanded] = useState(false)
  const [isThoughtModalOpen, setIsThoughtModalOpen] = useState(false)
  const [thoughtArticleContext, setThoughtArticleContext] = useState<{id: string, title: string} | undefined>()

  const renderMainContent = () => {
    switch (mainContent) {
      case 'digest':
        return (
          <div className="glass-medium rounded-2xl p-6 h-full">
            <h2 className="text-2xl font-bold text-neutral-50 mb-6">Today's Highlights</h2>
            <DailyDigest />
          </div>
        )
      case 'news':
        return (
          <div className="glass-medium rounded-2xl p-6 h-full">
            <h2 className="text-2xl font-bold text-neutral-50 mb-6">All Articles</h2>
            <NewsWidget />
          </div>
        )
      case 'recommendations':
        return (
          <div className="glass-medium rounded-2xl p-6 h-full">
            <h2 className="text-2xl font-bold text-neutral-50 mb-6">Recommended for You</h2>
            <RecommendationsView />
          </div>
        )
      case 'read-later':
        return (
          <div className="glass-medium rounded-2xl p-6 h-full">
            <h2 className="text-2xl font-bold text-neutral-50 mb-6">Read Later Queue</h2>
            <ReadLaterView />
          </div>
        )
      case 'thoughts':
        return (
          <div className="glass-medium rounded-2xl p-6 h-full">
            <h2 className="text-2xl font-bold text-neutral-50 mb-6">Captured Thoughts</h2>
            <ThoughtsView onCaptureNew={() => setIsThoughtModalOpen(true)} />
          </div>
        )
      case 'topics':
        return (
          <div className="glass-medium rounded-2xl p-6 h-full">
            <h2 className="text-2xl font-bold text-neutral-50 mb-6">Browse by Topic</h2>
            <div className="text-center py-12">
              <p className="text-neutral-400">Topic browsing coming soon...</p>
            </div>
          </div>
        )
      case 'search':
        return (
          <div className="glass-medium rounded-2xl p-6 h-full">
            <h2 className="text-2xl font-bold text-neutral-50 mb-6">Search Articles</h2>
            <SearchBar />
          </div>
        )
      case 'journal':
        return (
          <div className="glass-medium rounded-2xl p-6 h-full">
            <DeveloperJournal />
          </div>
        )
      case 'admin':
        return (
          <div className="glass-medium rounded-2xl p-6 h-full">
            <FeedAdmin />
          </div>
        )
      case 'analytics':
        return (
          <div className="glass-medium rounded-2xl p-6 h-full">
            <AnalyticsDashboard />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Daily Summary Bar - Above Everything */}
      <DailySummaryBar />

      {/* Main Grid: Content Area (left) + Sidebar (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area - 70% width (2 columns) */}
        <div className="lg:col-span-2 min-h-[600px]">
          {renderMainContent()}
        </div>

        {/* Right Sidebar - 30% width (1 column) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Actions - First Widget */}
          <QuickActions
            onNewIdea={() => console.log('New Idea - TODO: Open form')}
            onCaptureThought={() => {
              setThoughtArticleContext(undefined)
              setIsThoughtModalOpen(true)
            }}
            onReviewIdeas={() => console.log('Review Ideas - TODO: Open form')}
          />

          {/* Today's Priorities */}
          <TodaysPriorities
            onViewAllTasks={() => setMainContent('digest')} // TODO: Create a tasks view
          />

          {/* Tasks Widget */}
          <TasksWidget
            onViewAll={() => console.log('View All Tasks - TODO')}
            onTaskClick={(taskId) => console.log('Open task form for:', taskId)}
          />

          {/* Ranked News (compact version) */}
          <div className="glass-medium rounded-2xl overflow-hidden">
            {/* Header - Always Visible */}
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={() => setIsNewsExpanded(!isNewsExpanded)}
                className="flex items-center gap-2 hover:text-ember-400 transition-colors flex-1"
              >
                <h2 className="text-base font-bold text-neutral-50">Ranked News</h2>
                <svg
                  className={`w-4 h-4 text-neutral-500 transition-transform ${
                    isNewsExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* View All Link - Always Visible */}
              <button
                onClick={() => setMainContent('news')}
                className="text-xs text-neutral-400 hover:text-ember-400 transition-colors whitespace-nowrap"
              >
                View all →
              </button>
            </div>

            {/* Expandable Content */}
            {isNewsExpanded && (
              <div className="px-4 pb-4 pt-0">
                <NewsWidget
                  compact={true}
                  limit={5}
                />
              </div>
            )}
          </div>

          {/* Trending Topics */}
          <TrendingTopics
            onTopicClick={(topic) => {
              console.log('Clicked topic:', topic)
              setMainContent('topics') // Navigate to topics view
            }}
          />
        </div>
      </div>

      {/* Footer: Collections Links */}
      <CollectionsLinks onNavigate={setMainContent} activeView={mainContent} />

      {/* Thought Capture Modal - Available globally */}
      <ThoughtCaptureModal
        isOpen={isThoughtModalOpen}
        onClose={() => {
          setIsThoughtModalOpen(false)
          setThoughtArticleContext(undefined)
        }}
        articleId={thoughtArticleContext?.id}
        articleTitle={thoughtArticleContext?.title}
      />
    </div>
  )
}
