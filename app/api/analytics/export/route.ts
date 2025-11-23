import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Helper to escape CSV values
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Helper to format date range
function getDateRange(days: number) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  return { startDate, endDate }
}

// GET /api/analytics/export - Export analytics data as CSV
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const type = searchParams.get('type') || 'activities' // activities, articles, todos, logs
    const { startDate } = getDateRange(days)

    let csvContent = ''
    let filename = `ember-feed-${type}-${new Date().toISOString().split('T')[0]}.csv`

    switch (type) {
      case 'activities': {
        // Export user activities with article details
        const activities = await prisma.userActivity.findMany({
          where: { timestamp: { gte: startDate } },
          orderBy: { timestamp: 'desc' },
          include: {
            article: {
              select: {
                title: true,
                source: true,
                url: true
              }
            }
          }
        })

        csvContent = 'Timestamp,Action,Article Title,Source,Duration (seconds),Scroll %,URL\n'
        csvContent += activities.map(a => {
          return [
            escapeCSV(a.timestamp.toISOString()),
            escapeCSV(a.action),
            escapeCSV(a.article.title),
            escapeCSV(a.article.source),
            escapeCSV(a.durationSeconds),
            escapeCSV(a.scrollPercentage),
            escapeCSV(a.article.url)
          ].join(',')
        }).join('\n')
        break
      }

      case 'articles': {
        // Export articles with engagement metrics
        const articles = await prisma.article.findMany({
          where: { createdAt: { gte: startDate } },
          orderBy: { publishedAt: 'desc' },
          include: {
            activities: {
              select: { action: true }
            }
          }
        })

        csvContent = 'Title,Source,Score,Published At,Views,Reads,Upvotes,Downvotes,URL\n'
        csvContent += articles.map(a => {
          const views = a.activities.filter(act => act.action === 'view').length
          const reads = a.activities.filter(act => act.action === 'read').length
          const upvotes = a.activities.filter(act => act.action === 'upvote').length
          const downvotes = a.activities.filter(act => act.action === 'downvote').length

          return [
            escapeCSV(a.title),
            escapeCSV(a.source),
            escapeCSV(a.score),
            escapeCSV(a.publishedAt.toISOString()),
            escapeCSV(views),
            escapeCSV(reads),
            escapeCSV(upvotes),
            escapeCSV(downvotes),
            escapeCSV(a.url)
          ].join(',')
        }).join('\n')
        break
      }

      case 'todos': {
        // Export todo completion history
        const todos = await prisma.todo.findMany({
          where: {
            completed: true,
            updatedAt: { gte: startDate }
          },
          orderBy: { updatedAt: 'desc' }
        })

        csvContent = 'Task,Completed,Created At,Completed At\n'
        csvContent += todos.map(t => {
          return [
            escapeCSV(t.text),
            escapeCSV(t.completed),
            escapeCSV(t.createdAt.toISOString()),
            escapeCSV(t.updatedAt.toISOString())
          ].join(',')
        }).join('\n')
        break
      }

      case 'logs': {
        // Export log entries
        const logs = await prisma.logEntry.findMany({
          where: { createdAt: { gte: startDate } },
          orderBy: { createdAt: 'desc' }
        })

        csvContent = 'Type,Content,Tags,Created At\n'
        csvContent += logs.map(l => {
          return [
            escapeCSV(l.type),
            escapeCSV(l.content),
            escapeCSV(l.tags),
            escapeCSV(l.createdAt.toISOString())
          ].join(',')
        }).join('\n')
        break
      }

      case 'summary': {
        // Export summary statistics
        const totalActivities = await prisma.userActivity.count({
          where: { timestamp: { gte: startDate } }
        })

        const activityBreakdown = await prisma.userActivity.groupBy({
          by: ['action'],
          where: { timestamp: { gte: startDate } },
          _count: { action: true }
        })

        const sourceBreakdown = await prisma.article.groupBy({
          by: ['source'],
          _count: { source: true }
        })

        csvContent = 'Metric,Value\n'
        csvContent += `Total Activities,${totalActivities}\n`
        csvContent += `\nActivity Breakdown\n`
        csvContent += `Action,Count\n`
        csvContent += activityBreakdown.map(a =>
          `${escapeCSV(a.action)},${escapeCSV(a._count.action)}`
        ).join('\n')
        csvContent += `\n\nSource Breakdown\n`
        csvContent += `Source,Count\n`
        csvContent += sourceBreakdown.map(s =>
          `${escapeCSV(s.source)},${escapeCSV(s._count.source)}`
        ).join('\n')
        break
      }

      default:
        return NextResponse.json(
          { error: 'Invalid export type. Must be: activities, articles, todos, logs, or summary' },
          { status: 400 }
        )
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error exporting analytics:', error)
    return NextResponse.json(
      { error: 'Failed to export analytics', details: message },
      { status: 500 }
    )
  }
}
