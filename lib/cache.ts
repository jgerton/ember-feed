/**
 * Redis-backed cache with TTL support
 * Used for caching expensive computations like user profiles and recommendations
 *
 * Benefits over in-memory cache:
 * - Persists across server restarts
 * - Can be shared across multiple server instances
 * - Built-in TTL management and eviction policies
 * - Handles larger cache sizes efficiently
 */

import Redis from 'ioredis'

class RedisCache {
  private redis: Redis
  private isConnected: boolean = false

  constructor() {
    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        // Exponential backoff: 50ms, 100ms, 200ms, then give up
        if (times > 3) {
          console.error('Redis connection failed after 3 retries')
          return null
        }
        return Math.min(times * 50, 200)
      },
      lazyConnect: true, // Don't connect immediately
    })

    // Connection event handlers
    this.redis.on('connect', () => {
      this.isConnected = true
      console.log('✅ Redis connected')
    })

    this.redis.on('error', (err) => {
      this.isConnected = false
      console.error('Redis connection error:', err.message)
    })

    this.redis.on('close', () => {
      this.isConnected = false
      console.log('Redis connection closed')
    })

    // Attempt initial connection
    this.redis.connect().catch((err) => {
      console.error('Failed to connect to Redis:', err.message)
    })
  }

  /**
   * Get a value from cache
   * Returns undefined if not found or connection is down
   */
  async get<T>(key: string): Promise<T | undefined> {
    if (!this.isConnected) {
      console.warn('Redis not connected, cache miss for:', key)
      return undefined
    }

    try {
      const value = await this.redis.get(key)

      if (!value) {
        return undefined
      }

      // Parse JSON value
      return JSON.parse(value) as T
    } catch (error) {
      console.error('Redis get error:', error)
      return undefined
    }
  }

  /**
   * Set a value in cache with TTL (time to live) in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    if (!this.isConnected) {
      console.warn('Redis not connected, skipping cache set for:', key)
      return
    }

    try {
      // Serialize value to JSON
      const serialized = JSON.stringify(value)

      // Set with TTL (EX = seconds)
      await this.redis.set(key, serialized, 'EX', ttlSeconds)
    } catch (error) {
      console.error('Redis set error:', error)
    }
  }

  /**
   * Delete a specific key from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.isConnected) {
      return
    }

    try {
      await this.redis.del(key)
    } catch (error) {
      console.error('Redis delete error:', error)
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    if (!this.isConnected) {
      return
    }

    try {
      await this.redis.flushdb()
    } catch (error) {
      console.error('Redis clear error:', error)
    }
  }

  /**
   * Get current cache size (number of keys)
   */
  async size(): Promise<number> {
    if (!this.isConnected) {
      return 0
    }

    try {
      return await this.redis.dbsize()
    } catch (error) {
      console.error('Redis size error:', error)
      return 0
    }
  }

  /**
   * Check if Redis is connected and healthy
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isConnected) {
      return false
    }

    try {
      const pong = await this.redis.ping()
      return pong === 'PONG'
    } catch (error) {
      console.error('Redis health check failed:', error)
      return false
    }
  }

  /**
   * Get Redis connection info for monitoring
   */
  getConnectionInfo() {
    return {
      connected: this.isConnected,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    }
  }

  /**
   * Gracefully close Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit()
    } catch (error) {
      console.error('Redis disconnect error:', error)
    }
  }
}

// Singleton instance
export const cache = new RedisCache()

/**
 * Invalidate user-related caches when data changes
 * Call this when user activities, todos, or log entries are created/updated
 */
export async function invalidateUserCaches(): Promise<void> {
  await Promise.all([
    cache.delete('user-profile'),
    cache.delete('user-activities'),
    cache.delete('recommendations'),
    cache.delete('digest-data'), // Digest depends on user data
  ])
}
