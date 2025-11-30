import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL || 'postgresql://ember:ember_dev@postgres:5432/ember_feed'

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
