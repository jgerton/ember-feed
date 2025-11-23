import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * System Health Status API
 *
 * Calculates overall system health by analyzing:
 * - Feed health (sync status, failures)
 * - Content freshness (recent articles)
 * - Reading engagement (user activity)
 * - Task completion (todo status)
 *
 * Returns green/yellow/red status with actionable insights
 */
export async function GET() {
  try {
    const now = new Date()
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const twoDaysAgoStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

    // Run all health checks in parallel
    const [
      feedsHealth,
      recentArticlesCount,
      totalArticlesCount,
      recentActivity,
      yesterdayActivity,
      incompleteTodos,
      overdueTodos,
      totalTodos
    ] = await Promise.all([
      // Feed health check
      prisma.rssFeed.findMany({
        select: {
          name: true,
          status: true,
          consecutiveFailures: true,
          lastSuccessAt: true
        }
      }),
      // Recent articles (last 6 hours)
      prisma.article.count({
        where: {
          publishedAt: {
            gte: sixHoursAgo
          }
        }
      }),
      // Total articles (last 24 hours)
      prisma.article.count({
        where: {
          publishedAt: {
            gte: twentyFourHoursAgo
          }
        }
      }),
      // Recent user activity (last 24 hours)
      prisma.userActivity.count({
        where: {
          timestamp: {
            gte: twentyFourHoursAgo
          }
        }
      }),
      // Yesterday's activity (for trend comparison)
      prisma.userActivity.count({
        where: {
          timestamp: {
            gte: twoDaysAgoStart,
            lt: yesterday
          }
        }
      }),
      // Incomplete todos
      prisma.todo.count({
        where: {
          completed: false
        }
      }),
      // Overdue todos (older than 7 days and incomplete)
      prisma.todo.count({
        where: {
          completed: false,
          createdAt: {
            lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      // Total todos
      prisma.todo.count()
    ])

    // Calculate Feed Health Score
    const feedHealthResult = calculateFeedHealth(feedsHealth, sixHoursAgo, twentyFourHoursAgo)

    // Calculate Content Freshness Score
    const freshnessResult = calculateContentFreshness(recentArticlesCount, totalArticlesCount)

    // Calculate Engagement Score
    const engagementResult = calculateEngagement(recentActivity, yesterdayActivity, twoDaysAgo)

    // Calculate Task Status Score
    const taskResult = calculateTaskStatus(incompleteTodos, overdueTodos, totalTodos)

    // Calculate Overall Health
    const subsystemScores = [
      feedHealthResult.score,
      freshnessResult.score,
      engagementResult.score,
      taskResult.score
    ]

    const overallScore = Math.round(
      subsystemScores.reduce((a, b) => a + b, 0) / subsystemScores.length
    )

    // Determine overall status
    const hasRed = [feedHealthResult, freshnessResult, engagementResult, taskResult]
      .some(r => r.status === 'red')
    const hasYellow = [feedHealthResult, freshnessResult, engagementResult, taskResult]
      .some(r => r.status === 'yellow')

    const overallStatus = hasRed ? 'red' : hasYellow ? 'yellow' : 'green'

    // Calculate trend (vs yesterday)
    const trend = recentActivity > yesterdayActivity ? 'up' :
                  recentActivity < yesterdayActivity ? 'down' : 'stable'
    const trendPercent = yesterdayActivity > 0
      ? Math.round(((recentActivity - yesterdayActivity) / yesterdayActivity) * 100)
      : 0

    // Generate insights and quick actions
    const insights = generateInsights({
      feedHealth: feedHealthResult,
      freshness: freshnessResult,
      engagement: engagementResult,
      tasks: taskResult
    })

    const quickActions = generateQuickActions({
      feedHealth: feedHealthResult,
      freshness: freshnessResult,
      engagement: engagementResult,
      tasks: taskResult
    })

    return NextResponse.json({
      overall: {
        status: overallStatus,
        score: overallScore,
        trend: trend === 'stable' ? '0%' : `${trendPercent > 0 ? '+' : ''}${trendPercent}%`,
        direction: trend
      },
      subsystems: {
        feeds: {
          status: feedHealthResult.status,
          score: feedHealthResult.score,
          issues: feedHealthResult.issues
        },
        freshness: {
          status: freshnessResult.status,
          score: freshnessResult.score,
          issues: freshnessResult.issues
        },
        engagement: {
          status: engagementResult.status,
          score: engagementResult.score,
          issues: engagementResult.issues
        },
        tasks: {
          status: taskResult.status,
          score: taskResult.score,
          issues: taskResult.issues
        }
      },
      insights,
      quickActions,
      timestamp: now.toISOString()
    })
  } catch (error) {
    console.error('Error calculating system health:', error)
    return NextResponse.json(
      { error: 'Failed to calculate system health' },
      { status: 500 }
    )
  }
}

/**
 * Calculate feed health based on sync status and failures
 */
function calculateFeedHealth(
  feeds: Array<{ name: string; status: string; consecutiveFailures: number; lastSuccessAt: Date | null }>,
  sixHoursAgo: Date,
  twentyFourHoursAgo: Date
) {
  if (feeds.length === 0) {
    return { status: 'yellow' as const, score: 50, issues: ['No feeds configured'] }
  }

  const failedFeeds = feeds.filter(f => f.consecutiveFailures > 0)
  const staleFeeds = feeds.filter(f =>
    f.lastSuccessAt && f.lastSuccessAt < twentyFourHoursAgo
  )
  const slowFeeds = feeds.filter(f =>
    f.lastSuccessAt && f.lastSuccessAt < sixHoursAgo && f.lastSuccessAt >= twentyFourHoursAgo
  )

  const issues: string[] = []

  if (failedFeeds.length > 0) {
    issues.push(`${failedFeeds.length} feed${failedFeeds.length > 1 ? 's' : ''} failing`)
  }
  if (staleFeeds.length > 0) {
    issues.push(`${staleFeeds.length} feed${staleFeeds.length > 1 ? 's' : ''} not synced in 24+ hours`)
  }
  if (slowFeeds.length > 0) {
    issues.push(`${slowFeeds.length} feed${slowFeeds.length > 1 ? 's' : ''} slower than usual`)
  }

  // Calculate score
  const healthyFeeds = feeds.length - failedFeeds.length - staleFeeds.length
  const score = Math.round((healthyFeeds / feeds.length) * 100)

  // Determine status
  let status: 'green' | 'yellow' | 'red'
  if (failedFeeds.length > 0 || staleFeeds.length > 2) {
    status = 'red'
  } else if (staleFeeds.length > 0 || slowFeeds.length > 1) {
    status = 'yellow'
  } else {
    status = 'green'
  }

  return { status, score, issues }
}

/**
 * Calculate content freshness based on recent articles
 */
function calculateContentFreshness(recentCount: number, totalCount: number) {
  const issues: string[] = []

  let status: 'green' | 'yellow' | 'red'
  let score: number

  if (recentCount === 0) {
    status = totalCount === 0 ? 'red' : 'yellow'
    score = totalCount === 0 ? 0 : 40
    issues.push(totalCount === 0 ? 'No new articles in 24 hours' : 'No new articles in 6 hours')
  } else if (recentCount < 3) {
    status = 'yellow'
    score = 60
    issues.push('Low article volume')
  } else {
    status = 'green'
    score = Math.min(100, 60 + (recentCount * 5))
  }

  return { status, score, issues }
}

/**
 * Calculate engagement based on user activity
 */
function calculateEngagement(recentActivity: number, yesterdayActivity: number, twoDaysAgo: Date) {
  const issues: string[] = []

  let status: 'green' | 'yellow' | 'red'
  let score: number

  if (recentActivity === 0) {
    const hoursSinceActivity = Math.floor((Date.now() - twoDaysAgo.getTime()) / (1000 * 60 * 60))
    if (hoursSinceActivity > 72) {
      status = 'red'
      score = 0
      issues.push('No activity in 3+ days')
    } else if (hoursSinceActivity > 24) {
      status = 'yellow'
      score = 40
      issues.push('No activity today')
    } else {
      status = 'yellow'
      score = 60
      issues.push('Low engagement today')
    }
  } else {
    status = 'green'
    score = Math.min(100, 60 + (recentActivity * 2))
  }

  return { status, score, issues }
}

/**
 * Calculate task status based on incomplete and overdue tasks
 */
function calculateTaskStatus(incomplete: number, overdue: number, total: number) {
  const issues: string[] = []

  if (total === 0) {
    return { status: 'green' as const, score: 100, issues: [] }
  }

  let status: 'green' | 'yellow' | 'red'
  let score: number

  if (overdue > 3) {
    status = 'red'
    score = 30
    issues.push(`${overdue} overdue tasks`)
  } else if (overdue > 0 || incomplete > 5) {
    status = 'yellow'
    score = 60
    if (overdue > 0) issues.push(`${overdue} overdue tasks`)
    if (incomplete > 5) issues.push(`${incomplete} incomplete tasks`)
  } else {
    status = 'green'
    score = 100 - (incomplete * 5)
  }

  return { status, score, issues }
}

/**
 * Generate actionable insights based on health status
 */
function generateInsights(health: {
  feedHealth: { status: string; issues: string[] }
  freshness: { status: string; issues: string[] }
  engagement: { status: string; issues: string[] }
  tasks: { status: string; issues: string[] }
}) {
  const insights: Array<{ type: 'success' | 'warning' | 'error'; message: string; action: string | null }> = []

  // Feed health insights
  if (health.feedHealth.status === 'red') {
    insights.push({
      type: 'error',
      message: health.feedHealth.issues[0] || 'Feed issues detected',
      action: 'View Feed Health'
    })
  }

  // Freshness insights
  if (health.freshness.status === 'red' || health.freshness.status === 'yellow') {
    insights.push({
      type: health.freshness.status === 'red' ? 'error' : 'warning',
      message: health.freshness.issues[0] || 'Content needs refresh',
      action: 'Sync Now'
    })
  }

  // Engagement insights
  if (health.engagement.status === 'yellow' || health.engagement.status === 'red') {
    insights.push({
      type: 'warning',
      message: health.engagement.issues[0] || 'Reading activity low',
      action: 'View Feed'
    })
  }

  // Task insights
  if (health.tasks.status === 'red') {
    insights.push({
      type: 'error',
      message: health.tasks.issues[0] || 'Tasks need attention',
      action: 'View Tasks'
    })
  }

  // Success message if all green
  if (insights.length === 0) {
    insights.push({
      type: 'success',
      message: 'All systems healthy',
      action: null
    })
  }

  return insights
}

/**
 * Generate quick action buttons based on health status
 */
function generateQuickActions(health: {
  feedHealth: { status: string }
  freshness: { status: string }
  engagement: { status: string }
  tasks: { status: string }
}) {
  const actions: Array<{ label: string; endpoint?: string; url?: string }> = []

  if (health.freshness.status !== 'green') {
    actions.push({ label: 'Sync All Feeds', endpoint: '/api/sync' })
  }

  if (health.feedHealth.status !== 'green') {
    actions.push({ label: 'View Feed Health', url: '/#feed-admin' })
  }

  if (health.tasks.status !== 'green') {
    actions.push({ label: 'View Tasks', url: '/#quick-tasks' })
  }

  if (health.engagement.status !== 'green') {
    actions.push({ label: 'Browse Feed', url: '/#news-feed' })
  }

  return actions
}
