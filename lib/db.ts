import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Test mode uses a separate database for isolation
const isTestMode = process.env.TEST_MODE === 'true'

// Get database URL from environment
// When TEST_MODE=true, use the test database to avoid polluting production data
const defaultDbUrl = 'postgresql://ember:ember_dev@postgres:5432/ember_feed'
const testDbUrl = 'postgresql://ember:ember_dev@postgres:5432/ember_feed_test'
const databaseUrl = isTestMode
  ? (process.env.TEST_DATABASE_URL || testDbUrl)
  : (process.env.DATABASE_URL || defaultDbUrl)

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: databaseUrl,
})

// Create Prisma PostgreSQL adapter
const adapter = new PrismaPg(pool)

// Prisma 7: Connection via pg driver adapter
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
