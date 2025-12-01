'use client'

import { useState } from 'react'
import ThemeToggle from '@/components/ThemeToggle'
import LayoutToggle from '@/components/LayoutToggle'
import SystemHealthStatus from '@/components/SystemHealthStatus'
import MorningBriefLayout from '@/components/layouts/MorningBriefLayout'
import ZenDashboardLayout from '@/components/layouts/ZenDashboardLayout'
import PrototypeLayout from '@/components/layouts/PrototypeLayout'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { CollectionView } from '@/components/CollectionsLinks'

export default function Home() {
  const [layoutMode, setLayoutMode] = useLayoutMode()
  const [requestedView, setRequestedView] = useState<CollectionView | null>(null)

  return (
    <main className="min-h-screen glass-background p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-ember-500 mb-1 sm:mb-2">
                Ember Feed
              </h1>
              <p className="text-sm sm:text-base text-neutral-400">
                Your personalized news dashboard
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <SystemHealthStatus mode={layoutMode === 'morning-brief' ? 'multi-ring' : 'radial-gauge'} />
              <LayoutToggle mode={layoutMode} onChange={setLayoutMode} />
              <ThemeToggle />
              <button
                onClick={() => setRequestedView('settings')}
                className="p-2 rounded-lg bg-neutral-800/50 hover:bg-neutral-700/50 transition-colors"
                title="Settings"
              >
                <svg className="w-5 h-5 text-neutral-400 hover:text-neutral-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Layout Content - Conditionally render based on selected mode */}
        {layoutMode === 'morning-brief' ? (
          <MorningBriefLayout />
        ) : layoutMode === 'zen-dashboard' ? (
          <ZenDashboardLayout />
        ) : (
          <PrototypeLayout
            requestedView={requestedView}
            onViewNavigated={() => setRequestedView(null)}
          />
        )}
      </div>
    </main>
  )
}
