'use client'

import { useState } from 'react'
import SettingsPanel from '@/components/SettingsPanel'
import FeedAdmin from '@/components/FeedAdmin'

type SettingsTab = 'general' | 'feeds' | 'n8n'

interface N8nHealth {
  status: string
  n8n: {
    enabled: boolean
    reachable: boolean
  }
  errors: {
    total: number
    last24Hours: number
    lastHour: number
  }
  feeds: {
    active: number
    failing: number
    quarantined: number
  }
}

function N8nWorkflowsPanel() {
  const [health, setHealth] = useState<N8nHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const checkHealth = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/n8n/health')
      if (res.ok) {
        const data = await res.json()
        setHealth(data)
      } else {
        setMessage({ type: 'error', text: 'Failed to check n8n health' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to health endpoint' })
    } finally {
      setLoading(false)
    }
  }

  const triggerWorkflow = async (workflow: string) => {
    setTriggering(workflow)
    setMessage(null)
    try {
      let endpoint = ''
      let body = {}

      if (workflow === 'collector') {
        endpoint = '/api/n8n/trigger-collector'
        body = {}
      } else if (workflow === 'health-check') {
        setMessage({ type: 'success', text: 'Health Check runs automatically every 6 hours' })
        setTriggering(null)
        return
      } else if (workflow === 'scraper') {
        endpoint = '/api/n8n/trigger-apify'
        body = { scrapeAll: true }
      }

      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        const result = await res.json()
        if (result.success) {
          setMessage({ type: 'success', text: `${workflow} workflow triggered successfully` })
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to trigger workflow' })
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to trigger workflow' })
    } finally {
      setTriggering(null)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
            : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}>
          {message.text}
        </div>
      )}

      {/* n8n Health Status */}
      <div className="glass-light p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-50">n8n Health Status</h3>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="px-4 py-2 bg-ember-600 text-white rounded-lg hover:bg-ember-700 disabled:opacity-50 transition-colors text-sm"
          >
            {loading ? 'Checking...' : 'Check Health'}
          </button>
        </div>

        {health ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-neutral-800/30 rounded-lg">
              <div className="text-sm text-neutral-400">Status</div>
              <div className={`text-lg font-bold ${
                health.status === 'healthy' ? 'text-green-400' :
                health.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {health.status}
              </div>
            </div>
            <div className="p-4 bg-neutral-800/30 rounded-lg">
              <div className="text-sm text-neutral-400">n8n Reachable</div>
              <div className={`text-lg font-bold ${health.n8n.reachable ? 'text-green-400' : 'text-red-400'}`}>
                {health.n8n.reachable ? 'Yes' : 'No'}
              </div>
            </div>
            <div className="p-4 bg-neutral-800/30 rounded-lg">
              <div className="text-sm text-neutral-400">Errors (24h)</div>
              <div className={`text-lg font-bold ${health.errors.last24Hours > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {health.errors.last24Hours}
              </div>
            </div>
            <div className="p-4 bg-neutral-800/30 rounded-lg">
              <div className="text-sm text-neutral-400">Active Feeds</div>
              <div className="text-lg font-bold text-neutral-50">{health.feeds.active}</div>
            </div>
          </div>
        ) : (
          <p className="text-neutral-400 text-sm">Click "Check Health" to view n8n status</p>
        )}
      </div>

      {/* Workflow Controls */}
      <div className="glass-light p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-neutral-50 mb-4">Workflow Controls</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-neutral-800/30 rounded-lg">
            <div>
              <h4 className="font-medium text-neutral-100">Feed Collector</h4>
              <p className="text-sm text-neutral-400">Collects articles from RSS feeds every 15 minutes</p>
            </div>
            <button
              onClick={() => triggerWorkflow('collector')}
              disabled={triggering === 'collector'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
            >
              {triggering === 'collector' ? 'Running...' : 'Run Now'}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-neutral-800/30 rounded-lg">
            <div>
              <h4 className="font-medium text-neutral-100">Feed Health Check</h4>
              <p className="text-sm text-neutral-400">Checks failing feeds every 6 hours</p>
            </div>
            <button
              onClick={() => triggerWorkflow('health-check')}
              disabled={triggering === 'health-check'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
            >
              {triggering === 'health-check' ? 'Running...' : 'Info'}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-neutral-800/30 rounded-lg">
            <div>
              <h4 className="font-medium text-neutral-100">Apify Scraper</h4>
              <p className="text-sm text-neutral-400">Scrapes newsletter and complex feeds using Apify</p>
            </div>
            <button
              onClick={() => triggerWorkflow('scraper')}
              disabled={triggering === 'scraper'}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
            >
              {triggering === 'scraper' ? 'Running...' : 'Trigger Scrape'}
            </button>
          </div>
        </div>
      </div>

      {/* n8n Web UI Link */}
      <div className="glass-light p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-neutral-50 mb-2">n8n Web Interface</h3>
        <p className="text-sm text-neutral-400 mb-4">
          Access the full n8n workflow editor for advanced configuration
        </p>
        <a
          href="http://localhost:5678"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-700 text-neutral-100 rounded-lg hover:bg-neutral-600 transition-colors text-sm"
        >
          Open n8n Dashboard
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  )
}

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  const tabs = [
    { id: 'general' as SettingsTab, label: 'General', icon: '⚙️' },
    { id: 'feeds' as SettingsTab, label: 'Feed Admin', icon: '📡' },
    { id: 'n8n' as SettingsTab, label: 'n8n Workflows', icon: '🔄' },
  ]

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-neutral-700/50 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all ${
              activeTab === tab.id
                ? 'bg-ember-500/20 text-ember-400 border-b-2 border-ember-500'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/30'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'general' && <SettingsPanel />}
        {activeTab === 'feeds' && <FeedAdmin />}
        {activeTab === 'n8n' && <N8nWorkflowsPanel />}
      </div>
    </div>
  )
}
