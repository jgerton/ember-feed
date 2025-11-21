'use client'

import NewsWidget from '@/components/NewsWidget'
import TodoList from '@/components/TodoList'
import ThemeToggle from '@/components/ThemeToggle'
import DailySummary from '@/components/DailySummary'

export default function Home() {
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
            <ThemeToggle />
          </div>
        </header>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* News Feed - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2">
            <div className="glass-medium rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-neutral-50 mb-4">
                Today's Feed
              </h2>
              <NewsWidget />
            </div>
          </div>

          {/* Sidebar - Todo List */}
          <div className="lg:col-span-1">
            <div className="glass-medium rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-neutral-50 mb-4">
                Quick Tasks
              </h2>
              <TodoList />
            </div>
          </div>
        </div>

        {/* Daily Summary Section */}
        <div className="mt-6">
          <div className="glass-light rounded-2xl p-6">
            <h2 className="text-xl font-bold text-neutral-50 mb-3">
              Daily Summary
            </h2>
            <DailySummary />
          </div>
        </div>
      </div>
    </main>
  )
}
