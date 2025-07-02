import { Redis } from '@upstash/redis'
import IORedis from 'ioredis'

// Upstash Redis for HTTP-based operations (no server required)
export const redis = Redis.fromEnv()

// IORedis connection for BullMQ (fallback to in-memory if no connection)
const getRedisUrl = () => {
  if (process.env.KV_URL) {
    return process.env.KV_URL
  }
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL
  }
  // Return null to use in-memory fallback
  return null
}

let queueRedisInstance: IORedis | null = null

try {
  const redisUrl = getRedisUrl()
  if (redisUrl && redisUrl !== 'redis://username:password@host:port') {
    queueRedisInstance = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    })
  }
} catch (error) {
  console.warn('Redis connection not available, using in-memory fallback')
}

export const queueRedis = queueRedisInstance

// Test Redis connection
export async function testRedisConnection(): Promise<boolean> {
  try {
    if (queueRedisInstance) {
      await queueRedisInstance.ping()
      return true
    } else {
      // Test Upstash connection
      await redis.ping()
      return true
    }
  } catch (error) {
    console.error('Redis connection failed:', error)
    return false
  }
}

// Redis utilities for caching
export class RedisCache {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key)
      return value && typeof value === 'string' ? JSON.parse(value) : null
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  }

  static async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value)
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serialized)
      } else {
        await redis.set(key, serialized)
      }
      return true
    } catch (error) {
      console.error('Redis set error:', error)
      return false
    }
  }

  static async del(key: string): Promise<boolean> {
    try {
      await redis.del(key)
      return true
    } catch (error) {
      console.error('Redis del error:', error)
      return false
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Redis exists error:', error)
      return false
    }
  }

  // Rate limiting
  static async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const current = await redis.incr(key)
      
      if (current === 1) {
        await redis.expire(key, windowSeconds)
      }

      const ttl = await redis.ttl(key)
      const resetTime = Date.now() + (ttl * 1000)
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime,
      }
    } catch (error) {
      console.error('Rate limit check error:', error)
      return { allowed: true, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 }
    }
  }
}