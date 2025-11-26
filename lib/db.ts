import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Parse DATABASE_URL to get absolute path for SQLite
function getDatabasePath(): string {
  const dbUrl = process.env.DATABASE_URL || 'file:./data/dashboard.db'
  // Extract path from file: URL and resolve to absolute
  const relativePath = dbUrl.replace(/^file:/, '')
  // Return just the absolute path without file: prefix
  return path.resolve(process.cwd(), relativePath)
}

// Prisma 7 requires an explicit adapter for database connections
const adapter = new PrismaBetterSqlite3(
  { url: getDatabasePath() },
  { timestampFormat: 'unixepoch-ms' } // Backward compatible timestamp format
)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
