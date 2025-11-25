'use client'

import SettingsPanel from '@/components/SettingsPanel'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-100 mb-6">Settings</h1>
        <SettingsPanel />
      </div>
    </div>
  )
}
