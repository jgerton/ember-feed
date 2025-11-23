'use client'

import { LayoutMode } from '@/hooks/useLayoutMode'

interface LayoutToggleProps {
  mode: LayoutMode
  onChange: (mode: LayoutMode) => void
}

export default function LayoutToggle({ mode, onChange }: LayoutToggleProps) {
  return (
    <div className="flex items-center gap-1 glass-medium rounded-lg p-1">
      {/* Morning Brief Button */}
      <button
        onClick={() => onChange('morning-brief')}
        className={`
          px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2 text-sm font-medium
          ${mode === 'morning-brief'
            ? 'bg-ember-500 text-neutral-50 shadow-lg'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/30'
          }
        `}
        aria-label="Switch to Morning Brief layout"
        title="Morning Brief - 2-column layout with hero section"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Grid icon for Morning Brief */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
          />
        </svg>
        <span className="hidden sm:inline">Brief</span>
      </button>

      {/* Zen Dashboard Button */}
      <button
        onClick={() => onChange('zen-dashboard')}
        className={`
          px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2 text-sm font-medium
          ${mode === 'zen-dashboard'
            ? 'bg-ember-500 text-neutral-50 shadow-lg'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/30'
          }
        `}
        aria-label="Switch to Zen Dashboard layout"
        title="Zen Dashboard - Single-column minimalist layout"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* List/Lines icon for Zen Dashboard */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        <span className="hidden sm:inline">Zen</span>
      </button>

      {/* Prototype Button */}
      <button
        onClick={() => onChange('prototype')}
        className={`
          px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2 text-sm font-medium
          ${mode === 'prototype'
            ? 'bg-ember-500 text-neutral-50 shadow-lg'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/30'
          }
        `}
        aria-label="Switch to Prototype layout"
        title="Prototype - Main content area with sidebar widgets"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Layout icon for Prototype */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
        <span className="hidden sm:inline">Proto</span>
      </button>
    </div>
  )
}
