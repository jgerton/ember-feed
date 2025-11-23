import cron from 'node-cron'
import { syncArticlesToDatabase } from './feedService'

let syncJob: cron.ScheduledTask | null = null
let isRunning = false
let lastRun: Date | null = null
let lastResult: { newCount: number; updatedCount: number; total: number } | null = null

/**
 * Start the automated RSS sync cron job
 * Runs every hour at the top of the hour
 */
export function startRssSyncCron() {
  if (syncJob) {
    console.log('RSS sync cron job already running')
    return
  }

  // Run every hour at the top of the hour (0 * * * *)
  syncJob = cron.schedule('0 * * * *', async () => {
    if (isRunning) {
      console.log('Sync already in progress, skipping...')
      return
    }

    try {
      isRunning = true
      console.log('🔄 Starting scheduled RSS sync...')

      const result = await syncArticlesToDatabase()

      lastRun = new Date()
      lastResult = result

      console.log(`✅ Sync complete: ${result.newCount} new, ${result.updatedCount} updated, ${result.total} total articles`)
    } catch (error) {
      console.error('❌ Scheduled RSS sync failed:', error)
    } finally {
      isRunning = false
    }
  })

  console.log('✅ RSS sync cron job started (runs hourly)')
}

/**
 * Stop the automated RSS sync cron job
 */
export function stopRssSyncCron() {
  if (syncJob) {
    syncJob.stop()
    syncJob = null
    console.log('RSS sync cron job stopped')
  }
}

/**
 * Manually trigger a sync (for testing or manual refresh)
 */
export async function triggerManualSync() {
  if (isRunning) {
    throw new Error('Sync already in progress')
  }

  try {
    isRunning = true
    console.log('🔄 Manual RSS sync triggered...')

    const result = await syncArticlesToDatabase()

    lastRun = new Date()
    lastResult = result

    console.log(`✅ Manual sync complete: ${result.newCount} new, ${result.updatedCount} updated`)

    return result
  } finally {
    isRunning = false
  }
}

/**
 * Get sync status for monitoring
 */
export function getSyncStatus() {
  return {
    isScheduled: syncJob !== null,
    isRunning,
    lastRun,
    lastResult
  }
}
