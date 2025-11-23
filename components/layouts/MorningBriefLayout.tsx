'use client'

import NewsWidget from '@/components/NewsWidget'
import TodoList from '@/components/TodoList'
import DailySummaryBar from '@/components/DailySummaryBar'
import QuickActions from '@/components/QuickActions'
import TodaysPriorities from '@/components/TodaysPriorities'
import DailyDigest from '@/components/DailyDigest'
import FeedAdmin from '@/components/FeedAdmin'
import DeveloperJournal from '@/components/DeveloperJournal'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'
import SearchBar from '@/components/SearchBar'

/**
 * Morning Brief Layout - 2-column grid with hero sections and sticky sidebar
 *
 * Optimized for desktop users who want to see multiple widgets at once.
 * Features:
 * - Daily Summary hero section at top
 * - Daily Digest with highlights
 * - 2-column grid: News feed (2/3 width) + Tasks sidebar (1/3 width)
 * - Feed admin, journal, and analytics sections below
 */
export default function MorningBriefLayout() {
  return (
    <>
      {/* Top Row: Summary + Priorities + Quick Actions - Equal columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Compact Daily Summary Bar */}
        <div id="daily-summary">
          <DailySummaryBar />
        </div>

        {/* Today's Priorities */}
        <div>
          <TodaysPriorities />
        </div>

        {/* Quick Actions Sidebar */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Daily Digest - Top articles, todos, and highlights */}
      <div className="mb-6" id="daily-digest">
        <DailyDigest />
      </div>

      {/* Search Section */}
      <div className="mb-6" id="search">
        <div className="glass-medium rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-neutral-50 mb-4">
            Search Articles
          </h2>
          <SearchBar />
        </div>
      </div>

      {/* Main Dashboard Grid - 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* News Feed - Takes up 2 columns on large screens */}
        <div className="lg:col-span-2" id="news-feed">
          <div className="glass-medium rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-neutral-50 mb-4">
              Today's Feed
            </h2>
            <NewsWidget />
          </div>
        </div>

        {/* Sidebar - Todo List */}
        <div className="lg:col-span-1" id="quick-tasks">
          <div className="glass-medium rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-neutral-50 mb-4">
              Quick Tasks
            </h2>
            <TodoList />
          </div>
        </div>
      </div>

      {/* Feed Admin Section */}
      <div className="mt-6">
        <FeedAdmin />
      </div>

      {/* Developer Journal Section */}
      <div className="mt-6">
        <DeveloperJournal />
      </div>

      {/* Analytics Dashboard Section */}
      <div className="mt-6">
        <div className="glass-light rounded-2xl p-6">
          <AnalyticsDashboard />
        </div>
      </div>
    </>
  )
}
