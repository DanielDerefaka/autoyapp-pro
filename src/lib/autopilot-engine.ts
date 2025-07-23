import { prisma } from './prisma'
import { rapidApiTwitterClient } from './rapidapi-twitter'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface AutopilotSettings {
  isEnabled: boolean
  maxRepliesPerDay: number
  maxRepliesPerHour: number
  minDelayBetweenReplies: number
  minDelayToSameUser: number
  enabledHours: string
  enabledDays: number[]
  targetSentimentFilter: string
  onlyReplyToVerified: boolean
  skipRetweets: boolean
  skipReplies: boolean
  minFollowerCount: number
  maxTweetAge: number
  pauseIfBlocked: boolean
  pauseIfRateLimited: boolean
  notifyOnPause: boolean
  customFilters: any
}

interface TweetCandidate {
  tweetId: string
  content: string
  authorUsername: string
  authorId: string
  publishedAt: string
  likeCount: number
  replyCount: number
  retweetCount: number
  sentimentScore: number | null
  targetUserId: string
  isVerified?: boolean
  followerCount?: number
}

export class AutopilotEngine {
  private isProcessing = false

  /**
   * Main autopilot processing function - called by cron job
   */
  async processAutopilot(): Promise<void> {
    if (this.isProcessing) {
      console.log('🤖 Autopilot already processing, skipping...')
      return
    }

    this.isProcessing = true
    console.log('🚀 Starting autopilot processing...')

    try {
      // Get all users with enabled autopilot
      const usersWithAutopilot = await this.getEnabledAutopilotUsers()
      console.log(`👥 Found ${usersWithAutopilot.length} users with autopilot enabled`)

      for (const user of usersWithAutopilot) {
        try {
          await this.processUserAutopilot(user)
        } catch (error) {
          console.error(`❌ Error processing autopilot for user ${user.id}:`, error)
          // Continue with other users
        }
      }

      console.log('✅ Autopilot processing completed')
    } catch (error) {
      console.error('❌ Fatal error in autopilot processing:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Process autopilot for a specific user
   */
  private async processUserAutopilot(user: any): Promise<void> {
    const settings = user.autopilotSettings
    console.log(`🔄 Processing autopilot for user ${user.email}`)

    // Check if autopilot should be active right now
    if (!this.isAutopilotActiveNow(settings)) {
      console.log(`⏰ Autopilot not active for user ${user.email} at this time`)
      return
    }

    // Check daily and hourly limits
    const usage = await this.getUserUsage(user.id)
    if (usage.dailyReplies >= settings.maxRepliesPerDay) {
      console.log(`📊 Daily limit reached for user ${user.email} (${usage.dailyReplies}/${settings.maxRepliesPerDay})`)
      return
    }
    if (usage.hourlyReplies >= settings.maxRepliesPerHour) {
      console.log(`📊 Hourly limit reached for user ${user.email} (${usage.hourlyReplies}/${settings.maxRepliesPerHour})`)
      return
    }

    // Get target users
    const targetUsers = await prisma.targetUser.findMany({
      where: {
        userId: user.id,
        isActive: true
      }
    })

    if (targetUsers.length === 0) {
      console.log(`🎯 No active target users for ${user.email}`)
      return
    }

    // Get recent tweets from target users
    const recentTweets = await this.getRecentTweetsForTargets(targetUsers, settings)
    console.log(`🐦 Found ${recentTweets.length} recent tweets for ${user.email}`)

    if (recentTweets.length === 0) {
      return
    }

    // Filter tweets based on criteria
    const eligibleTweets = await this.filterEligibleTweets(recentTweets, settings, user.id)
    console.log(`✅ ${eligibleTweets.length} tweets are eligible for reply`)

    if (eligibleTweets.length === 0) {
      return
    }

    // Sort by priority (engagement, recency, etc.)
    const prioritizedTweets = this.prioritizeTweets(eligibleTweets)

    // Process tweets until limits are reached
    const remainingDailyReplies = settings.maxRepliesPerDay - usage.dailyReplies
    const remainingHourlyReplies = settings.maxRepliesPerHour - usage.hourlyReplies
    const maxReplies = Math.min(remainingDailyReplies, remainingHourlyReplies, 3) // Max 3 per run

    const tweetsToProcess = prioritizedTweets.slice(0, maxReplies)

    for (const tweet of tweetsToProcess) {
      try {
        await this.processTweetReply(tweet, user, settings)
        // Add delay between processing tweets
        await this.delay(30000) // 30 seconds between processing
      } catch (error) {
        console.error(`❌ Error processing tweet ${tweet.tweetId}:`, error)
      }
    }
  }

  /**
   * Get users with enabled autopilot
   */
  private async getEnabledAutopilotUsers(): Promise<any[]> {
    try {
      return await prisma.user.findMany({
        where: {
          autopilotSettings: {
            isEnabled: true
          }
        },
        include: {
          autopilotSettings: true,
          xAccounts: {
            where: { isActive: true }
          },
          replyStyle: true,
          replyDumps: {
            where: { isActive: true }
          }
        }
      })
    } catch (error: any) {
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        console.log('AutopilotSettings table does not exist, no users to process')
        return []
      }
      throw error
    }
  }

  /**
   * Check if autopilot should be active based on time/day settings
   */
  private isAutopilotActiveNow(settings: AutopilotSettings): boolean {
    const now = new Date()
    const currentDay = now.getDay() === 0 ? 7 : now.getDay() // Convert Sunday from 0 to 7
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

    // Check if current day is enabled
    if (!settings.enabledDays.includes(currentDay)) {
      return false
    }

    // Check if current time is within enabled hours
    const [startTime, endTime] = settings.enabledHours.split('-')
    if (currentTime < startTime || currentTime > endTime) {
      return false
    }

    return true
  }

  /**
   * Get user's current usage stats
   */
  private async getUserUsage(userId: string): Promise<{
    dailyReplies: number
    hourlyReplies: number
    lastReplyTime: Date | null
  }> {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())

    const [dailyCount, hourlyCount, lastReply] = await Promise.all([
      // Daily count
      prisma.replyQueue.count({
        where: {
          userId,
          createdAt: { gte: startOfDay },
          status: { in: ['sent', 'pending'] }
        }
      }),
      // Hourly count
      prisma.replyQueue.count({
        where: {
          userId,
          createdAt: { gte: startOfHour },
          status: { in: ['sent', 'pending'] }
        }
      }),
      // Last reply time
      prisma.replyQueue.findFirst({
        where: {
          userId,
          status: { in: ['sent', 'pending'] }
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ])

    return {
      dailyReplies: dailyCount,
      hourlyReplies: hourlyCount,
      lastReplyTime: lastReply?.createdAt || null
    }
  }

  /**
   * Get recent tweets from target users
   */
  private async getRecentTweetsForTargets(
    targetUsers: any[], 
    settings: AutopilotSettings
  ): Promise<TweetCandidate[]> {
    const maxAge = new Date(Date.now() - settings.maxTweetAge * 60 * 1000)
    
    // Get tweets from database that are recent and haven't been replied to
    const tweets = await prisma.tweet.findMany({
      where: {
        targetUserId: { in: targetUsers.map(t => t.id) },
        publishedAt: { gte: maxAge },
        isDeleted: false,
        // Don't include tweets we've already queued replies for
        NOT: {
          replyQueue: {
            some: {
              status: { in: ['sent', 'pending'] }
            }
          }
        }
      },
      include: {
        targetUser: true
      },
      orderBy: { publishedAt: 'desc' },
      take: 50 // Limit to prevent overwhelming processing
    })

    return tweets.map(tweet => ({
      tweetId: tweet.tweetId,
      content: tweet.content,
      authorUsername: tweet.authorUsername,
      authorId: tweet.authorUsername, // We'll need to enhance this
      publishedAt: tweet.publishedAt.toISOString(),
      likeCount: tweet.likeCount,
      replyCount: tweet.replyCount,
      retweetCount: tweet.retweetCount,
      sentimentScore: tweet.sentimentScore,
      targetUserId: tweet.targetUserId
    }))
  }

  /**
   * Filter tweets based on autopilot criteria
   */
  private async filterEligibleTweets(
    tweets: TweetCandidate[], 
    settings: AutopilotSettings,
    userId: string
  ): Promise<TweetCandidate[]> {
    const filtered = []

    for (const tweet of tweets) {
      // Check sentiment filter
      if (settings.targetSentimentFilter !== 'all') {
        if (!this.matchesSentimentFilter(tweet.sentimentScore, settings.targetSentimentFilter)) {
          continue
        }
      }

      // Skip retweets if enabled
      if (settings.skipRetweets && tweet.content.startsWith('RT @')) {
        continue
      }

      // Skip replies if enabled
      if (settings.skipReplies && tweet.content.startsWith('@')) {
        continue
      }

      // Check if we've replied to this user recently
      if (await this.hasRecentReplyToUser(userId, tweet.authorUsername, settings.minDelayToSameUser)) {
        continue
      }

      // Check minimum delay since last reply
      if (await this.hasRecentReply(userId, settings.minDelayBetweenReplies)) {
        continue
      }

      filtered.push(tweet)
    }

    return filtered
  }

  /**
   * Check if sentiment matches filter
   */
  private matchesSentimentFilter(sentimentScore: number | null, filter: string): boolean {
    if (!sentimentScore) return filter === 'neutral'
    
    switch (filter) {
      case 'positive': return sentimentScore > 0.1
      case 'negative': return sentimentScore < -0.1
      case 'neutral': return sentimentScore >= -0.1 && sentimentScore <= 0.1
      default: return true
    }
  }

  /**
   * Check if we've replied to this user recently
   */
  private async hasRecentReplyToUser(
    userId: string, 
    authorUsername: string, 
    minDelay: number
  ): Promise<boolean> {
    const minTime = new Date(Date.now() - minDelay * 1000)
    
    const recentReply = await prisma.replyQueue.findFirst({
      where: {
        userId,
        status: { in: ['sent', 'pending'] },
        createdAt: { gte: minTime },
        tweet: {
          authorUsername
        }
      }
    })

    return !!recentReply
  }

  /**
   * Check if we've made any reply recently
   */
  private async hasRecentReply(userId: string, minDelay: number): Promise<boolean> {
    const minTime = new Date(Date.now() - minDelay * 1000)
    
    const recentReply = await prisma.replyQueue.findFirst({
      where: {
        userId,
        status: { in: ['sent', 'pending'] },
        createdAt: { gte: minTime }
      }
    })

    return !!recentReply
  }

  /**
   * Prioritize tweets for reply (most engaging first)
   */
  private prioritizeTweets(tweets: TweetCandidate[]): TweetCandidate[] {
    return tweets.sort((a, b) => {
      // Score based on engagement and recency
      const scoreA = a.likeCount + a.replyCount + a.retweetCount
      const scoreB = b.likeCount + b.replyCount + b.retweetCount
      
      // Prioritize higher engagement
      if (scoreB !== scoreA) {
        return scoreB - scoreA
      }
      
      // Then prioritize recency
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
  }

  /**
   * Process a single tweet reply
   */
  private async processTweetReply(
    tweet: TweetCandidate, 
    user: any, 
    settings: AutopilotSettings
  ): Promise<void> {
    console.log(`📝 Processing reply for tweet ${tweet.tweetId} by @${tweet.authorUsername}`)

    try {
      // Generate AI reply
      const replyContent = await this.generateReply(tweet, user)
      
      if (!replyContent) {
        console.log(`⚠️ No reply generated for tweet ${tweet.tweetId}`)
        return
      }

      // Calculate when to send the reply (with random delay)
      const delay = this.calculateReplyDelay(settings)
      const scheduledFor = new Date(Date.now() + delay)

      // Add to reply queue
      const queuedReply = await prisma.replyQueue.create({
        data: {
          userId: user.id,
          xAccountId: user.xAccounts[0]?.id, // Use first active X account
          tweetId: tweet.tweetId,
          replyContent,
          replyType: 'autopilot_generated',
          scheduledFor,
          status: 'pending'
        }
      })

      console.log(`✅ Reply queued for tweet ${tweet.tweetId}, scheduled for ${scheduledFor.toISOString()}`)

    } catch (error) {
      console.error(`❌ Error processing tweet reply for ${tweet.tweetId}:`, error)
      throw error
    }
  }

  /**
   * Generate AI reply for a tweet using the new auto-generate system
   */
  private async generateReply(tweet: TweetCandidate, user: any): Promise<string | null> {
    try {
      // Find the corresponding tweet in our database
      const dbTweet = await prisma.tweet.findUnique({
        where: { tweetId: tweet.tweetId }
      })

      if (!dbTweet) {
        console.error(`Tweet ${tweet.tweetId} not found in database`)
        return null
      }

      // Use the new auto-generate API that includes reply dump matching
      const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/replies/auto-generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN || 'internal'}` // For internal calls
        },
        body: JSON.stringify({
          tweetId: dbTweet.id, // Use internal tweet ID
          useReplyDumps: true,
          forceGenerate: true // Skip some ToS checks since we're already in autopilot mode
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error(`Failed to auto-generate reply: ${response.status}`, errorData)
        return null
      }

      const data = await response.json()
      
      // The auto-generate API already creates a queue entry, so we need to handle this differently
      if (data.success && data.reply) {
        // Delete the queue entry created by auto-generate since we'll create our own with autopilot settings
        await prisma.replyQueue.delete({
          where: { id: data.reply.id }
        })
        
        return data.reply.content
      }

      return null

    } catch (error) {
      console.error('Error generating reply:', error)
      return null
    }
  }

  /**
   * Calculate reply delay with randomization
   */
  private calculateReplyDelay(settings: AutopilotSettings): number {
    const baseDelay = settings.minDelayBetweenReplies * 1000 // Convert to milliseconds
    const randomJitter = Math.random() * 120000 // 0-2 minutes random jitter
    return baseDelay + randomJitter
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Emergency pause autopilot for a user (e.g., if blocked)
   */
  async pauseAutopilotForUser(userId: string, reason: string): Promise<void> {
    try {
      await prisma.autopilotSettings.update({
        where: { userId },
        data: { isEnabled: false }
      })

      // Log the pause reason
      await prisma.complianceLog.create({
        data: {
          userId,
          actionType: 'autopilot_paused',
          complianceStatus: 'warning',
          details: { reason }
        }
      })

      console.log(`⏸️ Autopilot paused for user ${userId}: ${reason}`)
    } catch (error) {
      console.error(`Error pausing autopilot for user ${userId}:`, error)
    }
  }

  /**
   * Check autopilot health and pause if necessary
   */
  async checkAutopilotHealth(): Promise<void> {
    // This would monitor for blocks, rate limits, etc.
    // Implementation depends on X API error monitoring
  }
}

export const autopilotEngine = new AutopilotEngine()