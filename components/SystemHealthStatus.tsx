'use client'

import { useEffect, useState, useRef } from 'react'
import * as d3 from 'd3'

interface SystemHealthData {
  overall: {
    status: 'green' | 'yellow' | 'red'
    score: number
    trend: string
    direction: 'up' | 'down' | 'stable'
  }
  subsystems: {
    feeds: { status: 'green' | 'yellow' | 'red'; score: number; issues: string[] }
    freshness: { status: 'green' | 'yellow' | 'red'; score: number; issues: string[] }
    engagement: { status: 'green' | 'yellow' | 'red'; score: number; issues: string[] }
    tasks: { status: 'green' | 'yellow' | 'red'; score: number; issues: string[] }
  }
  insights: Array<{ type: 'success' | 'warning' | 'error'; message: string; action: string | null }>
  quickActions: Array<{ label: string; endpoint?: string; url?: string }>
}

interface SystemHealthStatusProps {
  mode: 'multi-ring' | 'radial-gauge'
}

export default function SystemHealthStatus({ mode }: SystemHealthStatusProps) {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/system-health')
        const data = await res.json()
        setHealthData(data)
      } catch (error) {
        console.error('Failed to fetch system health:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
    // Refresh every 2 minutes
    const interval = setInterval(fetchHealth, 120000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !healthData) {
    return (
      <div className="animate-pulse">
        <div className="h-12 w-12 bg-neutral-700 rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Status Indicator */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative focus:outline-none focus:ring-2 focus:ring-ember-500 rounded-full"
        aria-label="System health status"
      >
        {mode === 'multi-ring' ? (
          <MultiRingIndicator data={healthData} />
        ) : (
          <RadialGaugeIndicator data={healthData} />
        )}
      </button>

      {/* Expanded Breakdown Panel */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsExpanded(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-14 z-50 w-80 glass-light rounded-xl shadow-2xl border border-neutral-700 p-4">
            <h3 className="text-lg font-bold text-neutral-100 mb-3">System Health</h3>

            {/* Overall Status */}
            <div className="mb-4 p-3 rounded-lg bg-neutral-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-400">Overall Health</span>
                <span className={`text-2xl font-bold ${getScoreColor(healthData.overall.score)}`}>
                  {healthData.overall.score}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <StatusBadge status={healthData.overall.status} />
                <span className="text-neutral-500">
                  {healthData.overall.trend} {getTrendIcon(healthData.overall.direction)}
                </span>
              </div>
            </div>

            {/* Subsystem Breakdown */}
            <div className="space-y-2 mb-4">
              <SubsystemRow
                label="Feed Health"
                status={healthData.subsystems.feeds.status}
                score={healthData.subsystems.feeds.score}
                issues={healthData.subsystems.feeds.issues}
              />
              <SubsystemRow
                label="Content Freshness"
                status={healthData.subsystems.freshness.status}
                score={healthData.subsystems.freshness.score}
                issues={healthData.subsystems.freshness.issues}
              />
              <SubsystemRow
                label="Engagement"
                status={healthData.subsystems.engagement.status}
                score={healthData.subsystems.engagement.score}
                issues={healthData.subsystems.engagement.issues}
              />
              <SubsystemRow
                label="Task Status"
                status={healthData.subsystems.tasks.status}
                score={healthData.subsystems.tasks.score}
                issues={healthData.subsystems.tasks.issues}
              />
            </div>

            {/* Quick Actions */}
            {healthData.quickActions.length > 0 && (
              <div className="border-t border-neutral-700 pt-3">
                <h4 className="text-sm font-semibold text-neutral-300 mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  {healthData.quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (action.url) {
                          window.location.href = action.url
                        } else if (action.endpoint) {
                          fetch(action.endpoint, { method: 'POST' })
                            .then(() => window.location.reload())
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-ember-600 hover:bg-ember-700 text-white rounded-lg transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Multi-Ring Status Indicator (for Morning Brief mode)
 */
function MultiRingIndicator({ data }: { data: SystemHealthData }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = 48
    const height = 48
    const centerX = width / 2
    const centerY = height / 2

    // Subsystem data for rings
    const subsystems = [
      { name: 'feeds', score: data.subsystems.feeds.score, status: data.subsystems.feeds.status },
      { name: 'freshness', score: data.subsystems.freshness.score, status: data.subsystems.freshness.status },
      { name: 'engagement', score: data.subsystems.engagement.score, status: data.subsystems.engagement.status },
      { name: 'tasks', score: data.subsystems.tasks.score, status: data.subsystems.tasks.status }
    ]

    // Create rings
    const ringGroup = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`)

    subsystems.forEach((subsystem, index) => {
      const radius = 18 - (index * 3)
      const arcWidth = 2

      const arc = d3.arc()
        .innerRadius(radius - arcWidth)
        .outerRadius(radius)
        .startAngle(0)
        .endAngle((subsystem.score / 100) * 2 * Math.PI)

      ringGroup.append('path')
        .attr('d', arc as any)
        .attr('fill', getStatusColor(subsystem.status))
        .attr('opacity', 0.8)
    })

    // Center circle with overall status
    ringGroup.append('circle')
      .attr('r', 6)
      .attr('fill', getStatusColor(data.overall.status))
      .attr('class', 'drop-shadow-lg')

    // Pulse animation
    if (data.overall.status === 'red') {
      ringGroup.append('circle')
        .attr('r', 6)
        .attr('fill', 'none')
        .attr('stroke', getStatusColor(data.overall.status))
        .attr('stroke-width', 2)
        .attr('opacity', 0.6)
        .transition()
        .duration(1500)
        .attr('r', 12)
        .attr('opacity', 0)
        .on('end', function repeat() {
          d3.select(this)
            .attr('r', 6)
            .attr('opacity', 0.6)
            .transition()
            .duration(1500)
            .attr('r', 12)
            .attr('opacity', 0)
            .on('end', repeat)
        })
    }
  }, [data])

  return (
    <svg
      ref={svgRef}
      width="48"
      height="48"
      className="cursor-pointer hover:scale-110 transition-transform"
    />
  )
}

/**
 * Radial Gauge Indicator (for Zen mode)
 */
function RadialGaugeIndicator({ data }: { data: SystemHealthData }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = 48
    const height = 48
    const centerX = width / 2
    const centerY = height / 2
    const radius = 18

    const group = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`)

    // Background circle
    group.append('circle')
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', '#404040')
      .attr('stroke-width', 4)
      .attr('opacity', 0.3)

    // Progress arc
    const arc = d3.arc()
      .innerRadius(radius - 4)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(-Math.PI / 2 + (data.overall.score / 100) * 2 * Math.PI)

    group.append('path')
      .attr('d', arc as any)
      .attr('fill', getStatusColor(data.overall.status))
      .attr('class', 'drop-shadow-md')

    // Center circle
    group.append('circle')
      .attr('r', 8)
      .attr('fill', getStatusColor(data.overall.status))

    // Gentle pulse for all statuses
    group.append('circle')
      .attr('r', 8)
      .attr('fill', 'none')
      .attr('stroke', getStatusColor(data.overall.status))
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.5)
      .transition()
      .duration(2000)
      .attr('r', 14)
      .attr('opacity', 0)
      .on('end', function repeat() {
        d3.select(this)
          .attr('r', 8)
          .attr('opacity', 0.5)
          .transition()
          .duration(2000)
          .attr('r', 14)
          .attr('opacity', 0)
          .on('end', repeat)
      })
  }, [data])

  return (
    <svg
      ref={svgRef}
      width="48"
      height="48"
      className="cursor-pointer hover:scale-110 transition-transform"
    />
  )
}

/**
 * Helper Components
 */
function SubsystemRow({ label, status, score, issues }: {
  label: string
  status: 'green' | 'yellow' | 'red'
  score: number
  issues: string[]
}) {
  return (
    <div className="p-2 rounded-lg bg-neutral-800/30 hover:bg-neutral-800/50 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-neutral-300">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">{score}%</span>
          <StatusBadge status={status} size="sm" />
        </div>
      </div>
      {issues.length > 0 && (
        <p className="text-xs text-neutral-500">{issues[0]}</p>
      )}
    </div>
  )
}

function StatusBadge({ status, size = 'md' }: { status: 'green' | 'yellow' | 'red'; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
  return (
    <div className={`${sizeClasses} rounded-full ${status === 'green' ? 'bg-green-500' : status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} />
  )
}

/**
 * Helper Functions
 */
function getStatusColor(status: 'green' | 'yellow' | 'red'): string {
  switch (status) {
    case 'green': return '#10b981' // green-500
    case 'yellow': return '#f59e0b' // yellow-500
    case 'red': return '#ef4444' // red-500
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500'
  if (score >= 60) return 'text-yellow-500'
  return 'text-red-500'
}

function getTrendIcon(direction: 'up' | 'down' | 'stable'): string {
  switch (direction) {
    case 'up': return '↗️'
    case 'down': return '↘️'
    case 'stable': return '→'
  }
}
