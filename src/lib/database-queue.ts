/**
 * Database-based queue system fallback
 * When Redis is not available, use the existing ReplyQueue table as queue storage
 */

import { prisma } from './prisma'
import { ReplyJobData } from './queue'

/**
 * Database queue manager - works without Redis using existing ReplyQueue table
 */
export class DatabaseQueue {
  private static readonly MAX_ATTEMPTS = 3
  private static readonly BATCH_SIZE = 20

  /**
   * Add a reply job using existing ReplyQueue table
   */
  static async addReplyJob(data: ReplyJobData, delay?: number): Promise<string> {
    const scheduledFor = delay ? new Date(Date.now() + delay) : new Date()
    
    // The job is already in ReplyQueue table, just return the replyId
    return data.replyId
  }

  /**
   * Process reply jobs from ReplyQueue table
   */
  static async processReplyJobs(): Promise<{ processed: number; failed: number }> {
    // Get pending replies that are ready to be sent
    const pendingReplies = await prisma.replyQueue.findMany({
      where: {
        status: 'pending',
        scheduledFor: {
          lte: new Date(),
        },
        retryCount: { lt: this.MAX_ATTEMPTS }
      },
      include: {
        tweet: true,
        xAccount: true,
        user: {
          include: {
            autopilotSettings: true
          }
        }
      },
      take: this.BATCH_SIZE,
      orderBy: [
        { scheduledFor: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    let processed = 0
    let failed = 0

    console.log(`🔄 Processing ${pendingReplies.length} pending replies from database`)

    for (const reply of pendingReplies) {
      try {
        // Safety check for autopilot
        if (reply.replyType === 'autopilot_generated') {
          if (!reply.user?.autopilotSettings?.isEnabled) {
            await prisma.replyQueue.update({
              where: { id: reply.id },
              data: { 
                status: 'cancelled',
                errorMessage: 'Autopilot disabled by user'
              }
            })
            console.log(`⏸️ Cancelled autopilot reply ${reply.id} - autopilot disabled`)
            continue
          }
        }

        // Mark as processing to prevent duplicate processing
        await prisma.replyQueue.update({
          where: { id: reply.id },
          data: { status: 'processing' }
        })
        
        // Process the reply job
        await this.processReplyJob({
          replyId: reply.id,
          userId: reply.userId,
          xAccountId: reply.xAccountId,
          tweetId: reply.tweetId,
          replyContent: reply.replyContent,
          scheduledFor: reply.scheduledFor.toISOString(),
        })
        
        processed++
        console.log(`✅ Processed reply job ${reply.id}`)
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        // Mark as failed with retry logic
        await prisma.replyQueue.update({
          where: { id: reply.id },
          data: {
            status: reply.retryCount + 1 >= this.MAX_ATTEMPTS ? 'failed' : 'pending',
            retryCount: { increment: 1 },
            errorMessage: errorMessage,
            scheduledFor: reply.retryCount + 1 >= this.MAX_ATTEMPTS ? 
              reply.scheduledFor : 
              new Date(Date.now() + Math.pow(2, reply.retryCount + 1) * 60000) // Exponential backoff
          }
        })
        
        failed++
        console.error(`❌ Failed to process reply job ${reply.id}:`, errorMessage)
      }
    }

    return { processed, failed }
  }

  /**
   * Process a single reply job with enhanced rate limiting
   */
  private static async processReplyJob(data: ReplyJobData): Promise<void> {
    // Import here to avoid circular dependencies
    const { xApiClient } = await import('./x-api')
    const { RateLimiter } = await import('./rate-limiter')
    
    // Get reply from database
    const reply = await prisma.replyQueue.findUnique({
      where: { id: data.replyId },
      include: {
        tweet: true,
        xAccount: true,
        user: true,
      },
    })

    if (!reply) {
      throw new Error('Reply not found')
    }

    if (reply.status !== 'processing') {
      throw new Error(`Reply status is ${reply.status}, cannot process`)
    }

    // Enhanced rate limiting check
    const rateLimitCheck = await RateLimiter.checkReplyRateLimit(
      reply.userId, 
      reply.tweet.targetUserId
    )

    if (!rateLimitCheck.allowed) {
      // Schedule for later if rate limited
      const delayMs = rateLimitCheck.resetTime - Date.now()
      const newScheduledFor = new Date(Date.now() + delayMs + Math.random() * 60000) // Add 0-1 min buffer
      
      await prisma.replyQueue.update({
        where: { id: data.replyId },
        data: { 
          status: 'pending',
          scheduledFor: newScheduledFor,
          errorMessage: `Rate limited: ${rateLimitCheck.message}`
        }
      })
      
      throw new Error(`Rate limited: ${rateLimitCheck.message}`)
    }

    // Basic compliance check
    if (data.replyContent.length > 280) {
      throw new Error('Reply exceeds character limit')
    }

    // Decrypt access token
    const accessToken = Buffer.from(reply.xAccount.accessToken, 'base64').toString()

    // Send reply via X API
    const response = await xApiClient.postTweet(data.replyContent, {
      replyToTweetId: reply.tweet.tweetId,
      accessToken,
    })

    // Update reply status in database
    await prisma.replyQueue.update({
      where: { id: data.replyId },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    })

    // Record reply for rate limiting tracking
    await RateLimiter.recordReply(reply.userId, reply.tweet.targetUserId)

    // Track analytics
    await prisma.engagementAnalytics.create({
      data: {
        userId: reply.user.id,
        targetUserId: reply.tweet.targetUserId,
        replyId: data.replyId,
        engagementType: 'reply',
        engagementValue: 1,
      },
    })

    console.log(`📤 Reply sent successfully: ${response.data?.id} (Rate limit remaining: ${rateLimitCheck.remaining})`)
  }

  /**
   * Get queue statistics from ReplyQueue table
   */
  static async getQueueStats(): Promise<{
    pending: number
    processing: number
    sent: number
    failed: number
    cancelled: number
    totalJobs: number
  }> {
    const stats = await prisma.replyQueue.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    const result = {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      totalJobs: 0,
    }

    stats.forEach(stat => {
      const count = stat._count.id
      result.totalJobs += count
      
      switch (stat.status) {
        case 'pending':
          result.pending = count
          break
        case 'processing':
          result.processing = count
          break
        case 'sent':
          result.sent = count
          break
        case 'failed':
          result.failed = count
          break
        case 'cancelled':
          result.cancelled = count
          break
      }
    })

    return result
  }

  /**
   * Clean up old sent and failed replies
   */
  static async cleanup(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000))
    
    const result = await prisma.replyQueue.deleteMany({
      where: {
        status: { in: ['sent', 'failed'] },
        sentAt: { lt: cutoffDate }
      }
    })

    return result.count || 0
  }

  /**
   * Initialize - no initialization needed since we use existing ReplyQueue table
   */
  static async initialize(): Promise<void> {
    console.log('✅ Database queue ready (using ReplyQueue table)')
  }
}