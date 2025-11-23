import pino from 'pino'

// Create logger instance with pretty printing in development
export const logger = pino({
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
})

// Helper to log job start/completion
export function logJob(
  jobName: string,
  jobId: string,
  status: 'started' | 'completed' | 'failed',
  metadata?: object
) {
  if (status === 'started') {
    logger.info({ job: jobName, jobId, ...metadata }, `Starting job: ${jobName} (${jobId})`)
  } else if (status === 'completed') {
    logger.info({ job: jobName, jobId, ...metadata }, `Completed job: ${jobName} (${jobId})`)
  } else if (status === 'failed') {
    logger.error({ job: jobName, jobId, ...metadata }, `Job failed: ${jobName} (${jobId})`)
  }
}

// Helper to log errors
export function logError(error: Error | unknown, context?: string | object) {
  const contextObj = typeof context === 'string' ? { context } : context

  if (error instanceof Error) {
    logger.error(
      {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        ...contextObj,
      },
      typeof context === 'string' ? `Error in ${context}` : 'Error occurred'
    )
  } else {
    logger.error(
      { error, ...contextObj },
      typeof context === 'string' ? `Error in ${context}` : 'Error occurred'
    )
  }
}
