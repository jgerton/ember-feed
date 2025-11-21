import { NextResponse } from 'next/server'
import { syncArticlesToDatabase } from '@/lib/feedService'

// POST /api/articles/sync - Sync RSS feeds to database
export async function POST() {
  try {
    const result = await syncArticlesToDatabase()

    return NextResponse.json({
      success: true,
      message: `Synced ${result.newCount} new articles, ${result.updatedCount} updated, ${result.total} total fetched`,
      ...result
    })
  } catch (error) {
    console.error('Error syncing articles:', error)
    return NextResponse.json(
      { error: 'Failed to sync articles' },
      { status: 500 }
    )
  }
}
