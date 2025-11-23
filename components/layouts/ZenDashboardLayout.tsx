'use client'

import { useState } from 'react'
import NewsWidget from '@/components/NewsWidget'
import TodoList from '@/components/TodoList'
import DailySummary from '@/components/DailySummary'
import DailyDigest from '@/components/DailyDigest'
import FeedAdmin from '@/components/FeedAdmin'
import DeveloperJournal from '@/components/DeveloperJournal'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'
import SearchBar from '@/components/SearchBar'

/**
 * Zen Dashboard Layout - Single-column minimalist design for focused work
 *
 * Optimized for distraction-free reading and task management.
 * Features:
 * - Single column layout (mobile-first)
 * - Collapsible sections to reduce visual clutter
 * - Lighter visual treatment (subtle backgrounds)
 * - Priority-based ordering (tasks → feed → optional sections)
 * - More breathing room between sections
 */
export default function ZenDashboardLayout() {
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    digest: true,
    search: false,
    feed: true,
    tasks: true,
    admin: false,
    journal: false,
    analytics: false
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Quick Stats - Compact summary at top */}
      <CollapsibleSection
        title="Daily Summary"
        icon="📊"
        isExpanded={expandedSections.summary}
        onToggle={() => toggleSection('summary')}
      >
        <DailySummary />
      </CollapsibleSection>

      {/* Daily Digest - Highlights */}
      <CollapsibleSection
        title="Today's Highlights"
        icon="✨"
        isExpanded={expandedSections.digest}
        onToggle={() => toggleSection('digest')}
      >
        <DailyDigest />
      </CollapsibleSection>

      {/* Quick Tasks - Priority #1 in Zen mode */}
      <CollapsibleSection
        title="Quick Tasks"
        icon="✓"
        isExpanded={expandedSections.tasks}
        onToggle={() => toggleSection('tasks')}
        priority="high"
      >
        <TodoList />
      </CollapsibleSection>

      {/* News Feed - Priority #2 */}
      <CollapsibleSection
        title="Today's Feed"
        icon="📰"
        isExpanded={expandedSections.feed}
        onToggle={() => toggleSection('feed')}
        priority="high"
      >
        <NewsWidget />
      </CollapsibleSection>

      {/* Search - Collapsed by default for zen mode */}
      <CollapsibleSection
        title="Search Articles"
        icon="🔍"
        isExpanded={expandedSections.search}
        onToggle={() => toggleSection('search')}
      >
        <SearchBar />
      </CollapsibleSection>

      {/* Feed Admin - Collapsed by default */}
      <CollapsibleSection
        title="Feed Management"
        icon="⚙️"
        isExpanded={expandedSections.admin}
        onToggle={() => toggleSection('admin')}
      >
        <FeedAdmin />
      </CollapsibleSection>

      {/* Developer Journal - Collapsed by default */}
      <CollapsibleSection
        title="Developer Journal"
        icon="📝"
        isExpanded={expandedSections.journal}
        onToggle={() => toggleSection('journal')}
      >
        <DeveloperJournal />
      </CollapsibleSection>

      {/* Analytics - Collapsed by default */}
      <CollapsibleSection
        title="Analytics"
        icon="📈"
        isExpanded={expandedSections.analytics}
        onToggle={() => toggleSection('analytics')}
      >
        <AnalyticsDashboard />
      </CollapsibleSection>
    </div>
  )
}

/**
 * Collapsible Section Component for Zen Layout
 */
interface CollapsibleSectionProps {
  title: string
  icon: string
  isExpanded: boolean
  onToggle: () => void
  priority?: 'high' | 'normal'
  children: React.ReactNode
}

function CollapsibleSection({
  title,
  icon,
  isExpanded,
  onToggle,
  priority = 'normal',
  children
}: CollapsibleSectionProps) {
  // Zen mode uses lighter, more subtle styling
  const containerClasses = priority === 'high'
    ? 'bg-neutral-900/30 backdrop-blur-sm border border-neutral-800/50'
    : 'bg-neutral-900/20 backdrop-blur-sm border border-neutral-800/30'

  return (
    <div className={`rounded-xl overflow-hidden transition-all ${containerClasses}`}>
      {/* Section Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-800/20 transition-colors group"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <h2 className={`font-semibold ${priority === 'high' ? 'text-lg text-neutral-100' : 'text-base text-neutral-300'}`}>
            {title}
          </h2>
        </div>

        {/* Expand/Collapse Indicator */}
        <svg
          className={`w-5 h-5 text-neutral-500 group-hover:text-neutral-300 transition-all duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Section Content - Collapsible */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2">
          {children}
        </div>
      )}
    </div>
  )
}
