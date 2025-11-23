'use client'

import { useState } from 'react'

interface QuickActionsProps {
  onNewIdea?: () => void
  onCaptureThought?: () => void
  onReviewIdeas?: () => void
}

export default function QuickActions({ onNewIdea, onCaptureThought, onReviewIdeas }: QuickActionsProps = {}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="glass-light rounded-xl overflow-hidden">
      {/* Header - Always Visible */}
      <div className="p-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:text-ember-400 transition-colors w-full"
        >
          <h3 className="text-base font-semibold text-neutral-100">Quick Actions</h3>
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

      {/* Expandable Content - Action Buttons */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 space-y-2">
          <button
            onClick={onNewIdea}
            className="w-full px-4 py-2.5 bg-ember-600 hover:bg-ember-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project Idea
          </button>

          <button
            onClick={onCaptureThought}
            className="w-full px-4 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Capture Thought
          </button>

          <button
            onClick={onReviewIdeas}
            className="w-full px-4 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Review Ideas
          </button>
        </div>
      )}
    </div>
  )
}
