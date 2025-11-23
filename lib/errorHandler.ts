/**
 * Centralized error handling for API routes
 *
 * Provides consistent error responses and logging across all endpoints
 */

import { NextResponse } from 'next/server'

/**
 * Custom application errors with status codes
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
    this.name = 'RateLimitError'
  }
}

/**
 * Handle errors in API routes
 *
 * Usage:
 * ```typescript
 * export async function GET() {
 *   try {
 *     // ... your code
 *   } catch (error) {
 *     return handleApiError(error, { endpoint: '/api/articles' })
 *   }
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  context?: Record<string, unknown>
): NextResponse {
  // AppError - expected errors with status codes
  if (error instanceof AppError) {
    console.error('API Error:', error.message, { ...context, statusCode: error.statusCode, code: error.code })

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError && error.field ? { field: error.field } : {}),
      },
      { status: error.statusCode }
    )
  }

  // Standard Error - unexpected errors
  if (error instanceof Error) {
    console.error('API Error:', error.message, context)

    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production'
    return NextResponse.json(
      {
        error: isDevelopment ? error.message : 'Internal server error',
        ...(isDevelopment ? { stack: error.stack } : {}),
      },
      { status: 500 }
    )
  }

  // Unknown error type
  console.error('Unknown error type', { ...context, error })

  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
    },
    { status: 500 }
  )
}

/**
 * Async error wrapper for API route handlers
 *
 * Usage:
 * ```typescript
 * export const GET = withErrorHandler(async (request: Request) => {
 *   const data = await fetchData()
 *   return NextResponse.json(data)
 * })
 * ```
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  context?: Record<string, unknown>
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error, context)
    }
  }) as T
}

/**
 * Validate required fields in request body
 */
export function validateRequired<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      throw new ValidationError(`${String(field)} is required`, String(field))
    }
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string,
  allowedValues: readonly T[],
  fieldName: string
): T {
  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      fieldName
    )
  }
  return value as T
}

/**
 * Validate number range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): number {
  if (value < min || value > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`, fieldName)
  }
  return value
}
