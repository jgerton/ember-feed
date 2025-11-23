'use client'

import ThemeToggle from '@/components/ThemeToggle'
import LayoutToggle from '@/components/LayoutToggle'
import SystemHealthStatus from '@/components/SystemHealthStatus'
import MorningBriefLayout from '@/components/layouts/MorningBriefLayout'
import ZenDashboardLayout from '@/components/layouts/ZenDashboardLayout'
import PrototypeLayout from '@/components/layouts/PrototypeLayout'
import { useLayoutMode } from '@/hooks/useLayoutMode'

export default function Home() {
  const [layoutMode, setLayoutMode] = useLayoutMode()

  return (
    <main className="min-h-screen glass-background p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-ember-500 mb-2">
                Ember Feed
              </h1>
              <p className="text-neutral-400">
                Your personalized news dashboard
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SystemHealthStatus mode={layoutMode === 'morning-brief' ? 'multi-ring' : 'radial-gauge'} />
              <LayoutToggle mode={layoutMode} onChange={setLayoutMode} />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Layout Content - Conditionally render based on selected mode */}
        {layoutMode === 'morning-brief' ? (
          <MorningBriefLayout />
        ) : layoutMode === 'zen-dashboard' ? (
          <ZenDashboardLayout />
        ) : (
          <PrototypeLayout />
        )}
      </div>
    </main>
  )
}
