import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Health check endpoint - no auth required (read-only status info)
export async function GET() {
  try {
    const n8nEnabled = process.env.N8N_ENABLED !== 'false'
    const n8nUrl = process.env.N8N_URL || 'http://n8n:5678'

    // Check n8n connectivity
    let n8nReachable = false
    let n8nVersion: string | null = null

    if (n8nEnabled) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(`${n8nUrl}/healthz`, {
          method: 'GET',
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        n8nReachable = response.ok
        if (response.ok) {
          const data = await response.json().catch(() => ({}))
          n8nVersion = data.version || null
        }
      } catch (error) {
        // n8n not reachable
        n8nReachable = false
      }
    }

    // Get error stats from database
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000)

    const [
      totalErrors,
      errorsLast24h,
      errorsLastHour,
      recentErrors,
    ] = await Promise.all([
      prisma.n8nError.count(),
      prisma.n8nError.count({
        where: { createdAt: { gte: last24Hours } }
      }),
      prisma.n8nError.count({
        where: { createdAt: { gte: lastHour } }
      }),
      prisma.n8nError.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          errorType: true,
          errorMessage: true,
          workflowId: true,
          createdAt: true,
        }
      })
    ])

    // Get feed stats
    const [activeFeeds, failingFeeds, quarantinedFeeds] = await Promise.all([
      prisma.feed.count({ where: { status: 'active' } }),
      prisma.feed.count({ where: { status: 'failing' } }),
      prisma.feed.count({ where: { status: 'quarantined' } }),
    ])

    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    const issues: string[] = []

    if (!n8nEnabled) {
      status = 'degraded'
      issues.push('n8n integration is disabled')
    } else if (!n8nReachable) {
      status = 'unhealthy'
      issues.push('n8n is not reachable')
    }

    if (errorsLastHour > 10) {
      status = 'unhealthy'
      issues.push(`High error rate: ${errorsLastHour} errors in the last hour`)
    } else if (errorsLastHour > 5) {
      if (status === 'healthy') status = 'degraded'
      issues.push(`Elevated error rate: ${errorsLastHour} errors in the last hour`)
    }

    if (quarantinedFeeds > 0) {
      if (status === 'healthy') status = 'degraded'
      issues.push(`${quarantinedFeeds} feed(s) quarantined`)
    }

    return NextResponse.json({
      status,
      issues,
      n8n: {
        enabled: n8nEnabled,
        reachable: n8nReachable,
        version: n8nVersion,
        url: n8nUrl,
      },
      errors: {
        total: totalErrors,
        last24Hours: errorsLast24h,
        lastHour: errorsLastHour,
        recent: recentErrors,
      },
      feeds: {
        active: activeFeeds,
        failing: failingFeeds,
        quarantined: quarantinedFeeds,
      },
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Failed to perform health check',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
