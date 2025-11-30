'use client'

import { Select } from '@/components/ui/Select'

export type DateFilter = 'today' | '3days' | 'week' | 'all'

interface Topic {
  slug: string
  name: string
}

interface FilterBarProps {
  topics: Topic[]
  sources: string[]
  selectedTopic: string
  selectedSource: string
  dateFilter: DateFilter
  onTopicChange: (topic: string) => void
  onSourceChange: (source: string) => void
  onDateChange: (date: DateFilter) => void
  loading?: boolean
}

/**
 * FilterBar Component
 *
 * Horizontal filter bar for article lists with:
 * - Topic dropdown filter
 * - Source dropdown filter
 * - Quick date filter buttons (Today, 3 Days, Week, All)
 *
 * Mobile: horizontal scroll
 * Desktop: flex row
 */
export default function FilterBar({
  topics,
  sources,
  selectedTopic,
  selectedSource,
  dateFilter,
  onTopicChange,
  onSourceChange,
  onDateChange,
  loading = false
}: FilterBarProps) {
  const dateOptions: { value: DateFilter; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: '3days', label: '3 Days' },
    { value: 'week', label: 'Week' },
    { value: 'all', label: 'All Time' }
  ]

  const topicOptions = [
    { value: '', label: 'All Topics' },
    ...topics.map(t => ({ value: t.slug, label: t.name }))
  ]

  const sourceOptions = [
    { value: '', label: 'All Sources' },
    ...sources.map(s => ({ value: s, label: s }))
  ]

  return (
    <div className="glass-medium rounded-lg p-3 mb-4">
      {/* Mobile: horizontal scroll, Desktop: flex wrap */}
      <div className="flex gap-3 items-center overflow-x-auto scrollbar-hide pb-1 -mb-1">
        {/* Topic Filter */}
        <div className="flex-shrink-0 min-w-[140px]">
          <Select
            value={selectedTopic}
            onChange={onTopicChange}
            options={topicOptions}
            placeholder="All Topics"
            className="w-full"
          />
        </div>

        {/* Source Filter */}
        <div className="flex-shrink-0 min-w-[140px]">
          <Select
            value={selectedSource}
            onChange={onSourceChange}
            options={sourceOptions}
            placeholder="All Sources"
            className="w-full"
          />
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-neutral-700 flex-shrink-0 hidden sm:block" />

        {/* Date Filter Buttons */}
        <div className="flex gap-1 flex-shrink-0">
          {dateOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onDateChange(option.value)}
              disabled={loading}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
                ${dateFilter === option.value
                  ? 'bg-ember-500/20 text-ember-400 border border-ember-500/50'
                  : 'bg-neutral-800/30 text-neutral-400 border border-neutral-700/30 hover:bg-neutral-700/40 hover:text-neutral-300'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex-shrink-0 ml-auto">
            <div className="w-4 h-4 border-2 border-ember-500/30 border-t-ember-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
