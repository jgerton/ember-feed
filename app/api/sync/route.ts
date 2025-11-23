import { NextResponse } from 'next/server'
import { triggerManualSync, getSyncStatus } from '@/lib/cronService'

// GET /api/sync - Get sync status
export async function GET() {
  try {
    const status = getSyncStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}

// POST /api/sync - Trigger manual sync
export async function POST() {
  try {
    const result = await triggerManualSync()
    return NextResponse.json({
      success: true,
      message: `Sync complete: ${result.newCount} new articles, ${result.updatedCount} updated`,
      result
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message === 'Sync already in progress') {
      return NextResponse.json(
        { error: 'Sync already in progress' },
        { status: 409 }
      )
    }

    console.error('Error triggering manual sync:', error)
    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    )
  }
}
