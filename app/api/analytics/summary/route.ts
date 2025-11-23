import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Helper to get date range for queries
function getDateRange(days: number) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  return { startDate, endDate }
}

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Calculate reading streak
async function calculateReadingStreak() {
  const activities = await prisma.userActivity.findMany({
    where: { action: 'read' },
    orderBy: { timestamp: 'desc' },
    select: { timestamp: true }
  })

  if (activities.length === 0) return 0

  const uniqueDates = Array.from(new Set(
    activities.map(a => formatDate(a.timestamp))
  )).sort().reverse()

  let streak = 0
  const today = formatDate(new Date())
  let currentDate = today

  for (const date of uniqueDates) {
    if (date === currentDate) {
      streak++
      // Move to previous day
      const prevDate = new Date(currentDate)
      prevDate.setDate(prevDate.getDate() - 1)
      currentDate = formatDate(prevDate)
    } else {
      break
    }
  }

  return streak
}

// GET /api/analytics/summary - Get comprehensive analytics summary
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const { startDate } = getDateRange(days)

    // 1. Articles read over time (last N days)
    const readActivities = await prisma.userActivity.findMany({
      where: {
        action: 'read',
        timestamp: { gte: startDate }
      },
      select: { timestamp: true }
    })

    const readsByDate = readActivities.reduce((acc, activity) => {
      const date = formatDate(activity.timestamp)
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const articlesReadOverTime = Object.entries(readsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 2. Category breakdown by source
    const articles = await prisma.article.findMany({
      select: { source: true }
    })

    const categoryBreakdown = articles.reduce((acc, article) => {
      acc[article.source] = (acc[article.source] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const categoryData = Object.entries(categoryBreakdown)
      .map(([source, count]) => ({ source, count: count as number }))
      .sort((a, b) => b.count - a.count)

    // 3. Reading streak
    const readingStreak = await calculateReadingStreak()

    // 4. Most upvoted articles this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const upvotes = await prisma.userActivity.findMany({
      where: {
        action: 'upvote',
        timestamp: { gte: weekAgo }
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            source: true,
            url: true
          }
        }
      }
    })

    const upvotesByArticle = upvotes.reduce((acc, upvote) => {
      const id = upvote.article.id
      if (!acc[id]) {
        acc[id] = {
          article: upvote.article,
          upvotes: 0
        }
      }
      acc[id].upvotes++
      return acc
    }, {} as Record<string, { article: any, upvotes: number }>)

    const topUpvotedArticles = (Object.values(upvotesByArticle) as Array<{ article: any; upvotes: number }>)
      .sort((a, b) => b.upvotes - a.upvotes)
      .slice(0, 5)

    // 5. Productivity metrics
    const completedTodos = await prisma.todo.count({
      where: {
        completed: true,
        updatedAt: { gte: startDate }
      }
    })

    const logEntries = await prisma.logEntry.findMany({
      where: { createdAt: { gte: startDate } },
      select: { type: true }
    })

    const logEntriesByType = logEntries.reduce((acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // 6. Overall engagement metrics
    const totalViews = await prisma.userActivity.count({
      where: {
        action: 'view',
        timestamp: { gte: startDate }
      }
    })

    const totalReads = await prisma.userActivity.count({
      where: {
        action: 'read',
        timestamp: { gte: startDate }
      }
    })

    const avgReadingTime = await prisma.userActivity.aggregate({
      where: {
        action: 'read',
        timestamp: { gte: startDate },
        durationSeconds: { not: null }
      },
      _avg: {
        durationSeconds: true
      }
    })

    const avgScrollPercentage = await prisma.userActivity.aggregate({
      where: {
        action: 'read',
        timestamp: { gte: startDate },
        scrollPercentage: { not: null }
      },
      _avg: {
        scrollPercentage: true
      }
    })

    return NextResponse.json({
      period: { days, startDate, endDate: new Date() },
      articlesReadOverTime,
      categoryBreakdown: categoryData,
      readingStreak,
      topUpvotedArticles,
      productivity: {
        completedTodos,
        logEntriesByType
      },
      engagement: {
        totalViews,
        totalReads,
        avgReadingTimeSeconds: Math.round(avgReadingTime._avg.durationSeconds || 0),
        avgScrollPercentage: Math.round(avgScrollPercentage._avg.scrollPercentage || 0),
        readRate: totalViews > 0 ? ((totalReads / totalViews) * 100).toFixed(1) : '0'
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error fetching analytics summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics summary', details: message },
      { status: 500 }
    )
  }
}
