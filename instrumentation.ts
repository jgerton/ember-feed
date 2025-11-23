export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically import Node.js-only modules to avoid edge runtime compilation
    const { startRssSyncCron } = await import('./lib/cronService')

    // Start the RSS sync cron job when the server starts
    startRssSyncCron()
    console.log('🚀 Ember Feed server instrumentation loaded')
  }
}
