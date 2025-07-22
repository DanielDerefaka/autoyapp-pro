import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq'
import { queueRedis } from './redis'
import { prisma } from './prisma'
import { xApiClient } from './x-api'
import { replyGenerator } from './openai'

// Queue configurations
const queueOptions: QueueOptions | undefined = queueRedis ? {
  connection: queueRedis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
} : undefined

// Job data interfaces
export interface ReplyJobData {
  replyId: string
  userId: string
  xAccountId: string
  tweetId: string
  replyContent: string
  scheduledFor: string
}

export interface TweetScrapingJobData {
  userId: string
  targetUserId?: string
}

export interface ComplianceCheckJobData {
  userId: string
  timeWindow: number // in hours
}

export interface AnalyticsJobData {
  userId: string
  period: 'daily' | 'weekly' | 'monthly'
}

// Create queues (only if Redis is available)
export const replyQueue = queueOptions ? new Queue<ReplyJobData>('reply-processing', queueOptions) : null
export const scrapingQueue = queueOptions ? new Queue<TweetScrapingJobData>('tweet-scraping', queueOptions) : null
export const complianceQueue = queueOptions ? new Queue<ComplianceCheckJobData>('compliance-check', queueOptions) : null
export const analyticsQueue = queueOptions ? new Queue<AnalyticsJobData>('analytics-processing', queueOptions) : null

// Worker configurations
const workerOptions: WorkerOptions | undefined = queueRedis ? {
  connection: queueRedis,
  concurrency: 5,
} : undefined

// Reply Processing Worker (only if Redis is available)
export const replyWorker = workerOptions ? new Worker<ReplyJobData>(
  'reply-processing',
  async (job: Job<ReplyJobData>) => {
    const { replyId, userId, xAccountId, tweetId, replyContent } = job.data

    try {
      // Get reply from database
      const reply = await prisma.replyQueue.findUnique({
        where: { id: replyId },
        include: {
          tweet: true,
          xAccount: true,
          user: true,
        },
      })

      if (!reply) {
        throw new Error('Reply not found')
      }

      if (reply.status !== 'pending') {
        throw new Error(`Reply status is ${reply.status}, cannot process`)
      }

      // Check compliance before sending
      const complianceCheck = await checkReplyCompliance(reply.user.id, replyContent)
      if (!complianceCheck.allowed) {
        await prisma.replyQueue.update({
          where: { id: replyId },
          data: {
            status: 'failed',
            errorMessage: `Compliance check failed: ${complianceCheck.reason}`,
          },
        })
        throw new Error(`Compliance check failed: ${complianceCheck.reason}`)
      }

      // Decrypt access token
      const accessToken = Buffer.from(reply.xAccount.accessToken, 'base64').toString()

      // Send reply via X API
      const response = await xApiClient.postTweet(replyContent, {
        replyToTweetId: reply.tweet.tweetId,
        accessToken,
      })

      // Update reply status
      await prisma.replyQueue.update({
        where: { id: replyId },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      })

      // Log compliance action
      await prisma.complianceLog.create({
        data: {
          userId: reply.user.id,
          xAccountId: reply.xAccount.id,
          actionType: 'reply_sent',
          complianceStatus: 'compliant',
          details: {
            replyId,
            tweetId: reply.tweet.tweetId,
            contentLength: replyContent.length,
          },
        },
      })

      // Track analytics
      await prisma.engagementAnalytics.create({
        data: {
          userId: reply.user.id,
          targetUserId: reply.tweet.targetUserId,
          replyId: replyId,
          engagementType: 'reply',
          engagementValue: 1,
        },
      })

      return { success: true, tweetId: response.data.id }
    } catch (error) {
      // Update reply status to failed
      await prisma.replyQueue.update({
        where: { id: replyId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          retryCount: { increment: 1 },
        },
      })

      throw error
    }
  },
  workerOptions
) : null

// Tweet Scraping Worker (only if Redis is available)
export const scrapingWorker = workerOptions ? new Worker<TweetScrapingJobData>(
  'tweet-scraping',
  async (job: Job<TweetScrapingJobData>) => {
    const { userId, targetUserId } = job.data

    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Get targets to scrape
      const whereClause: any = {
        userId,
        isActive: true,
      }

      if (targetUserId) {
        whereClause.id = targetUserId
      }

      const targets = await prisma.targetUser.findMany({
        where: whereClause,
        include: {
          xAccount: true,
        },
      })

      let scrapedCount = 0

      for (const target of targets) {
        try {
          // Get target user info from X
          const xUser = await xApiClient.getUserByUsername(target.targetUsername)
          
          // Get the last scraped tweet ID for pagination
          const lastTweet = await prisma.tweet.findFirst({
            where: { targetUserId: target.id },
            orderBy: { publishedAt: 'desc' },
          })

          // Decrypt access token
          const accessToken = Buffer.from(target.xAccount.accessToken, 'base64').toString()

          // Fetch tweets
          const tweetsResponse = await xApiClient.getUserTweets(xUser.id, {
            maxResults: 10,
            sinceId: lastTweet?.tweetId,
            accessToken,
          })

          if (tweetsResponse.data) {
            for (const tweet of tweetsResponse.data) {
              // Check if tweet already exists
              const existingTweet = await prisma.tweet.findUnique({
                where: { tweetId: tweet.id },
              })

              if (!existingTweet) {
                // Analyze sentiment
                const sentiment = await replyGenerator.analyzeSentiment(tweet.text)

                await prisma.tweet.create({
                  data: {
                    tweetId: tweet.id,
                    targetUserId: target.id,
                    content: tweet.text,
                    authorUsername: target.targetUsername,
                    publishedAt: new Date(tweet.created_at),
                    likeCount: tweet.public_metrics.like_count,
                    replyCount: tweet.public_metrics.reply_count,
                    retweetCount: tweet.public_metrics.retweet_count,
                    sentimentScore: sentiment.score,
                  },
                })
                scrapedCount++
              }
            }

            // Update last scraped time
            await prisma.targetUser.update({
              where: { id: target.id },
              data: { lastScraped: new Date() },
            })
          }
        } catch (error) {
          console.error(`Error scraping tweets for ${target.targetUsername}:`, error)
        }
      }

      return { success: true, scrapedCount, targetsProcessed: targets.length }
    } catch (error) {
      throw error
    }
  },
  workerOptions
) : null

// Compliance checking function
async function checkReplyCompliance(
  userId: string,
  content: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // Check rate limits (e.g., max 50 replies per hour)
    const hourlyKey = `rate_limit:replies:${userId}:${Math.floor(Date.now() / 3600000)}`
    const rateCheck = await import('./redis').then(({ RedisCache }) =>
      RedisCache.checkRateLimit(hourlyKey, 50, 3600)
    )

    if (!rateCheck.allowed) {
      return { allowed: false, reason: 'Hourly rate limit exceeded' }
    }

    // Check daily limits (e.g., max 200 replies per day)
    const dailyKey = `rate_limit:daily_replies:${userId}:${Math.floor(Date.now() / 86400000)}`
    const dailyCheck = await import('./redis').then(({ RedisCache }) =>
      RedisCache.checkRateLimit(dailyKey, 200, 86400)
    )

    if (!dailyCheck.allowed) {
      return { allowed: false, reason: 'Daily rate limit exceeded' }
    }

    // Check content compliance
    if (content.length > 280) {
      return { allowed: false, reason: 'Content exceeds character limit' }
    }

    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{4,}/, // Repeated characters
      /(https?:\/\/[^\s]+){3,}/, // Multiple links
      /(@\w+\s*){5,}/, // Excessive mentions
    ]

    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        return { allowed: false, reason: 'Content flagged as potential spam' }
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Compliance check error:', error)
    return { allowed: false, reason: 'Compliance check failed' }
  }
}

// Queue management functions
export class QueueManager {
  static async addReplyJob(data: ReplyJobData, delay?: number): Promise<Job<ReplyJobData> | null> {
    if (!replyQueue) {
      console.warn('Reply queue not available - Redis not connected')
      return null
    }
    const options = delay ? { delay } : {}
    return replyQueue.add('process-reply', data, options)
  }

  static async addScrapingJob(data: TweetScrapingJobData): Promise<Job<TweetScrapingJobData> | null> {
    if (!scrapingQueue) {
      console.warn('Scraping queue not available - Redis not connected')
      return null
    }
    return scrapingQueue.add('scrape-tweets', data)
  }

  static async scheduleReplyProcessing(replyId: string, scheduledFor: Date): Promise<void> {
    const reply = await prisma.replyQueue.findUnique({
      where: { id: replyId },
      include: {
        tweet: true,
        xAccount: true,
      },
    })

    if (!reply) {
      throw new Error('Reply not found')
    }

    // Import rate limiter to calculate optimal delay
    const { RateLimiter } = await import('./rate-limiter')
    
    // Calculate optimal delay considering rate limits
    const optimalDelay = await RateLimiter.calculateOptimalDelay(reply.userId, reply.tweet.targetUserId)
    const requestedDelay = scheduledFor.getTime() - Date.now()
    
    // Use the longer of the two delays to ensure compliance
    const finalDelay = Math.max(optimalDelay, requestedDelay)
    
    const finalScheduledFor = new Date(Date.now() + finalDelay)
    
    // Update the database record with the optimal schedule time
    await prisma.replyQueue.update({
      where: { id: replyId },
      data: { scheduledFor: finalScheduledFor }
    })

    if (finalDelay > 0) {
      await this.addReplyJob({
        replyId: reply.id,
        userId: reply.userId,
        xAccountId: reply.xAccountId,
        tweetId: reply.tweetId,
        replyContent: reply.replyContent,
        scheduledFor: finalScheduledFor.toISOString(),
      }, finalDelay)
    } else {
      // Schedule immediately if no delay needed
      await this.addReplyJob({
        replyId: reply.id,
        userId: reply.userId,
        xAccountId: reply.xAccountId,
        tweetId: reply.tweetId,
        replyContent: reply.replyContent,
        scheduledFor: finalScheduledFor.toISOString(),
      })
    }

    console.log(`📅 Reply ${replyId} scheduled for ${finalScheduledFor.toISOString()} (${Math.ceil(finalDelay / 1000 / 60)} minutes from now)`)
  }

  static async getQueueStats() {
    if (!replyQueue || !scrapingQueue || !complianceQueue || !analyticsQueue) {
      return {
        replies: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        scraping: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        compliance: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        analytics: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      }
    }

    const stats = await Promise.all([
      replyQueue.getJobCounts(),
      scrapingQueue.getJobCounts(),
      complianceQueue.getJobCounts(),
      analyticsQueue.getJobCounts(),
    ])

    return {
      replies: stats[0],
      scraping: stats[1],
      compliance: stats[2],
      analytics: stats[3],
    }
  }

  static async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName)
    if (queue) {
      await queue.pause()
    }
  }

  static async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName)
    if (queue) {
      await queue.resume()
    }
  }

  static async clearFailedJobs(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName)
    if (queue) {
      await queue.clean(0, 100, 'failed')
    }
  }

  private static getQueue(name: string): Queue | null {
    switch (name) {
      case 'replies':
        return replyQueue
      case 'scraping':
        return scrapingQueue
      case 'compliance':
        return complianceQueue
      case 'analytics':
        return analyticsQueue
      default:
        return null
    }
  }
}