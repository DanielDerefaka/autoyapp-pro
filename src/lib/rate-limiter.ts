/**
 * Enhanced rate limiting system with database fallback
 * Ensures X ToS compliance with proper rate limiting
 */

import { prisma } from './prisma'
import { RedisCache } from './redis'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  message?: string
}

interface UserLimits {
  repliesPerHour: number
  repliesPerDay: number
  minDelayBetweenReplies: number // seconds
  minDelayToSameTarget: number // seconds
}

export class RateLimiter {
  // Default X-compliant limits
  static readonly DEFAULT_LIMITS: UserLimits = {
    repliesPerHour: 25, // Conservative limit
    repliesPerDay: 150, // Conservative limit
    minDelayBetweenReplies: 300, // 5 minutes
    minDelayToSameTarget: 1800, // 30 minutes
  }

  /**
   * Check if user can send a reply with comprehensive rate limiting
   */
  static async checkReplyRateLimit(
    userId: string, 
    targetUserId?: string
  ): Promise<RateLimitResult> {
    try {
      // Get user limits (from autopilot settings or defaults)
      const userLimits = await this.getUserLimits(userId)
      
      // Check hourly limit
      const hourlyCheck = await this.checkHourlyLimit(userId, userLimits.repliesPerHour)
      if (!hourlyCheck.allowed) {
        return {
          ...hourlyCheck,
          message: 'Hourly reply limit exceeded'
        }
      }

      // Check daily limit
      const dailyCheck = await this.checkDailyLimit(userId, userLimits.repliesPerDay)
      if (!dailyCheck.allowed) {
        return {
          ...dailyCheck,
          message: 'Daily reply limit exceeded'
        }
      }

      // Check minimum delay between any replies
      const delayCheck = await this.checkMinDelayBetweenReplies(userId, userLimits.minDelayBetweenReplies)
      if (!delayCheck.allowed) {
        return {
          ...delayCheck,
          message: `Must wait ${Math.ceil(delayCheck.resetTime - Date.now()) / 1000 / 60} minutes between replies`
        }
      }

      // Check minimum delay to same target
      if (targetUserId) {
        const targetDelayCheck = await this.checkMinDelayToSameTarget(
          userId, 
          targetUserId, 
          userLimits.minDelayToSameTarget
        )
        if (!targetDelayCheck.allowed) {
          return {
            ...targetDelayCheck,
            message: `Must wait ${Math.ceil(targetDelayCheck.resetTime - Date.now()) / 1000 / 60} minutes before replying to same user again`
          }
        }
      }

      return {
        allowed: true,
        remaining: Math.min(hourlyCheck.remaining, dailyCheck.remaining),
        resetTime: Math.min(hourlyCheck.resetTime, dailyCheck.resetTime)
      }

    } catch (error) {
      console.error('Rate limit check failed:', error)
      // Fail safe - allow the request but log the error
      return {
        allowed: true,
        remaining: 1,
        resetTime: Date.now() + 3600000,
        message: 'Rate limit check failed - allowing request'
      }
    }
  }

  /**
   * Record a successful reply for rate limiting tracking
   */
  static async recordReply(userId: string, targetUserId?: string): Promise<void> {
    try {
      const now = Date.now()

      // Record in Redis for fast access
      await Promise.all([
        RedisCache.set(`last_reply:${userId}`, now, 3600), // 1 hour TTL
        targetUserId ? RedisCache.set(`last_reply_to:${userId}:${targetUserId}`, now, 7200) : Promise.resolve(), // 2 hours TTL
        
        // Also update database for persistence
        prisma.engagementAnalytics.create({
          data: {
            userId,
            targetUserId,
            engagementType: 'reply_sent_tracking',
            engagementValue: 1,
          }
        })
      ])

    } catch (error) {
      console.error('Failed to record reply for rate limiting:', error)
    }
  }

  /**
   * Get user-specific rate limits
   */
  private static async getUserLimits(userId: string): Promise<UserLimits> {
    try {
      const autopilotSettings = await prisma.autopilotSettings.findUnique({
        where: { userId }
      })

      if (autopilotSettings) {
        return {
          repliesPerHour: autopilotSettings.maxRepliesPerHour,
          repliesPerDay: autopilotSettings.maxRepliesPerDay,
          minDelayBetweenReplies: autopilotSettings.minDelayBetweenReplies,
          minDelayToSameTarget: autopilotSettings.minDelayToSameUser,
        }
      }

      return this.DEFAULT_LIMITS
    } catch (error) {
      console.error('Failed to get user limits:', error)
      return this.DEFAULT_LIMITS
    }
  }

  /**
   * Check hourly reply limit
   */
  private static async checkHourlyLimit(userId: string, limit: number): Promise<RateLimitResult> {
    const hourKey = `replies_hour:${userId}:${Math.floor(Date.now() / 3600000)}`
    
    try {
      return await RedisCache.checkRateLimit(hourKey, limit, 3600)
    } catch (error) {
      // Database fallback - count replies in the last hour
      const hourAgo = new Date(Date.now() - 3600000)
      const replyCount = await prisma.replyQueue.count({
        where: {
          userId,
          sentAt: { gte: hourAgo },
          status: 'sent'
        }
      })

      return {
        allowed: replyCount < limit,
        remaining: Math.max(0, limit - replyCount),
        resetTime: Math.ceil(Date.now() / 3600000) * 3600000
      }
    }
  }

  /**
   * Check daily reply limit
   */
  private static async checkDailyLimit(userId: string, limit: number): Promise<RateLimitResult> {
    const dayKey = `replies_day:${userId}:${Math.floor(Date.now() / 86400000)}`
    
    try {
      return await RedisCache.checkRateLimit(dayKey, limit, 86400)
    } catch (error) {
      // Database fallback - count replies in the last 24 hours
      const dayAgo = new Date(Date.now() - 86400000)
      const replyCount = await prisma.replyQueue.count({
        where: {
          userId,
          sentAt: { gte: dayAgo },
          status: 'sent'
        }
      })

      return {
        allowed: replyCount < limit,
        remaining: Math.max(0, limit - replyCount),
        resetTime: Math.ceil(Date.now() / 86400000) * 86400000
      }
    }
  }

  /**
   * Check minimum delay between any replies
   */
  private static async checkMinDelayBetweenReplies(userId: string, minDelaySeconds: number): Promise<RateLimitResult> {
    try {
      const lastReplyTime = await RedisCache.get<number>(`last_reply:${userId}`)
      
      if (!lastReplyTime) {
        return { allowed: true, remaining: 1, resetTime: Date.now() }
      }

      const timeSinceLastReply = Date.now() - lastReplyTime
      const minDelayMs = minDelaySeconds * 1000

      if (timeSinceLastReply >= minDelayMs) {
        return { allowed: true, remaining: 1, resetTime: Date.now() }
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime: lastReplyTime + minDelayMs
      }

    } catch (error) {
      // Database fallback
      const lastReply = await prisma.replyQueue.findFirst({
        where: { 
          userId, 
          status: 'sent',
          sentAt: { not: null }
        },
        orderBy: { sentAt: 'desc' }
      })

      if (!lastReply?.sentAt) {
        return { allowed: true, remaining: 1, resetTime: Date.now() }
      }

      const timeSinceLastReply = Date.now() - lastReply.sentAt.getTime()
      const minDelayMs = minDelaySeconds * 1000

      return {
        allowed: timeSinceLastReply >= minDelayMs,
        remaining: timeSinceLastReply >= minDelayMs ? 1 : 0,
        resetTime: lastReply.sentAt.getTime() + minDelayMs
      }
    }
  }

  /**
   * Check minimum delay before replying to the same target again
   */
  private static async checkMinDelayToSameTarget(
    userId: string, 
    targetUserId: string, 
    minDelaySeconds: number
  ): Promise<RateLimitResult> {
    try {
      const lastReplyTime = await RedisCache.get<number>(`last_reply_to:${userId}:${targetUserId}`)
      
      if (!lastReplyTime) {
        return { allowed: true, remaining: 1, resetTime: Date.now() }
      }

      const timeSinceLastReply = Date.now() - lastReplyTime
      const minDelayMs = minDelaySeconds * 1000

      if (timeSinceLastReply >= minDelayMs) {
        return { allowed: true, remaining: 1, resetTime: Date.now() }
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime: lastReplyTime + minDelayMs
      }

    } catch (error) {
      // Database fallback
      const lastReply = await prisma.replyQueue.findFirst({
        where: { 
          userId, 
          status: 'sent',
          sentAt: { not: null },
          tweet: {
            targetUserId: targetUserId
          }
        },
        orderBy: { sentAt: 'desc' }
      })

      if (!lastReply?.sentAt) {
        return { allowed: true, remaining: 1, resetTime: Date.now() }
      }

      const timeSinceLastReply = Date.now() - lastReply.sentAt.getTime()
      const minDelayMs = minDelaySeconds * 1000

      return {
        allowed: timeSinceLastReply >= minDelayMs,
        remaining: timeSinceLastReply >= minDelayMs ? 1 : 0,
        resetTime: lastReply.sentAt.getTime() + minDelayMs
      }
    }
  }

  /**
   * Calculate optimal delay for scheduling a reply based on rate limits
   */
  static async calculateOptimalDelay(userId: string, targetUserId?: string): Promise<number> {
    try {
      const rateLimitCheck = await this.checkReplyRateLimit(userId, targetUserId)
      
      if (rateLimitCheck.allowed) {
        // Add small random delay to avoid patterns (1-3 minutes)
        return Math.random() * 120000 + 60000
      } else {
        // Schedule for after the rate limit resets, plus small buffer
        const delayUntilReset = rateLimitCheck.resetTime - Date.now()
        const bufferTime = Math.random() * 60000 + 30000 // 30s-90s buffer
        return Math.max(0, delayUntilReset + bufferTime)
      }
    } catch (error) {
      console.error('Failed to calculate optimal delay:', error)
      // Default to 5-10 minute delay
      return Math.random() * 300000 + 300000
    }
  }
}