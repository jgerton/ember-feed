/**
 * Test database utilities for transaction-based test isolation
 *
 * Provides transaction rollback patterns for unit tests that run
 * in the same process as the Prisma client.
 *
 * For E2E/Playwright tests (HTTP-based), use the /api/test/cleanup endpoint instead.
 */

import { Prisma } from '@prisma/client'
import { prisma } from './db'

/**
 * Custom error to trigger transaction rollback without failing the test
 */
class RollbackError extends Error {
  constructor() {
    super('ROLLBACK')
    this.name = 'RollbackError'
  }
}

/**
 * Wraps test execution in a Prisma transaction that automatically rolls back.
 * Use for unit tests that can share the same process as the database client.
 *
 * @example
 * test('creates article', async () => {
 *   await withTestTransaction(async (tx) => {
 *     const article = await tx.article.create({
 *       data: { title: 'Test', url: 'http://test.com', ... }
 *     })
 *     expect(article.title).toBe('Test')
 *   }) // Auto-rollback - no data persisted
 * })
 */
export async function withTestTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T | undefined> {
  let result: T | undefined

  try {
    await prisma.$transaction(async (tx) => {
      result = await fn(tx)
      throw new RollbackError() // Force rollback after test completes
    })
  } catch (e) {
    if (e instanceof RollbackError) {
      return result // Test passed, rollback was intentional
    }
    throw e // Re-throw actual errors
  }

  return result
}

/**
 * Check if we're in a context that supports true transaction rollback.
 * Returns true for unit tests, false for E2E/API tests via HTTP.
 */
export function canUseTransactionRollback(): boolean {
  // In same process as Prisma client = can use transactions
  return typeof prisma !== 'undefined' && process.env.TEST_TRANSACTION_MODE === 'true'
}

/**
 * Get the Prisma client for direct access in tests.
 * Prefer withTestTransaction() for automatic cleanup.
 */
export function getTestPrisma() {
  return prisma
}
