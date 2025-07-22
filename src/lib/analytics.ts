import { prisma } from './prisma'

export interface AnalyticsFilters {
  startDate?: Date
  endDate?: Date
  targetUserId?: string
  engagementType?: string
}

export interface EngagementMetrics {
  totalReplies: number
  sentReplies: number
  failedReplies: number
  pendingReplies: number
  successRate: number
  averageResponseTime: number
  engagementsByType: Record<string, number>
  dailyStats: Array<{
    date: string
    replies: number
    engagements: number
  }>
}

export interface TargetAnalytics {
  targetUsername: string
  totalTweets: number
  repliesSent: number
  engagementScore: number
  lastActivity: Date | null
  sentimentDistribution: {
    positive: number
    negative: number
    neutral: number
  }
}

export interface PerformanceMetrics {
  period: string
  totalEngagements: number
  responseRate: number
  conversionRate: number
  topPerformingTargets: Array<{
    username: string
    engagements: number
    replies: number
  }>
  engagementTrends: Array<{
    date: string
    engagements: number
    replies: number
    rate: number
  }>
}

export class AnalyticsService {
  static async getEngagementMetrics(
    userId: string,
    filters: AnalyticsFilters = {}
  ): Promise<EngagementMetrics> {
    const { startDate, endDate, targetUserId, engagementType } = filters

    // Build date filter
    const dateFilter = this.buildDateFilter(startDate, endDate)

    // Get reply statistics
    const replyStats = await prisma.replyQueue.groupBy({
      by: ['status'],
      where: {
        userId,
        ...dateFilter,
        ...(targetUserId && {
          tweet: {
            targetUserId,
          },
        }),
      },
      _count: { status: true },
    })

    const replyCounts = replyStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status
      return acc
    }, {} as Record<string, number>)

    const totalReplies = Object.values(replyCounts).reduce((sum, count) => sum + count, 0)
    const sentReplies = replyCounts.sent || 0
    const successRate = totalReplies > 0 ? (sentReplies / totalReplies) * 100 : 0

    // Get average response time (time between tweet creation and reply)
    const avgResponseTime = await this.getAverageResponseTime(userId, dateFilter)

    // Get engagements by type
    const engagementsByType = await prisma.engagementAnalytics.groupBy({
      by: ['engagementType'],
      where: {
        userId,
        ...this.buildDateFilter(startDate, endDate, 'trackedAt'),
        ...(targetUserId && { targetUserId }),
      },
      _sum: { engagementValue: true },
    })

    const engagementTypes = engagementsByType.reduce((acc, item) => {
      acc[item.engagementType] = item._sum.engagementValue || 0
      return acc
    }, {} as Record<string, number>)

    // Get daily stats for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const dailyStats = await this.getDailyStats(userId, thirtyDaysAgo, endDate || new Date())

    return {
      totalReplies,
      sentReplies,
      failedReplies: replyCounts.failed || 0,
      pendingReplies: replyCounts.pending || 0,
      successRate,
      averageResponseTime: avgResponseTime,
      engagementsByType: engagementTypes,
      dailyStats,
    }
  }

  static async getTargetAnalytics(
    userId: string,
    filters: AnalyticsFilters = {}
  ): Promise<TargetAnalytics[]> {
    const { startDate, endDate } = filters

    const targets = await prisma.targetUser.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            tweets: {
              where: this.buildDateFilter(startDate, endDate, 'publishedAt'),
            },
          },
        },
        tweets: {
          where: this.buildDateFilter(startDate, endDate, 'publishedAt'),
          select: {
            sentimentScore: true,
            replies: {
              where: {
                status: 'sent',
                ...this.buildDateFilter(startDate, endDate, 'sentAt'),
              },
            },
          },
        },
        analytics: {
          where: this.buildDateFilter(startDate, endDate, 'trackedAt'),
          select: {
            engagementValue: true,
            trackedAt: true,
          },
        },
      },
    })

    return targets.map((target) => {
      const tweets = target.tweets
      const sentimentScores = tweets
        .map(t => t.sentimentScore)
        .filter((score): score is number => score !== null)

      const sentimentDistribution = this.calculateSentimentDistribution(sentimentScores)
      const repliesSent = tweets.reduce((sum, tweet) => sum + tweet.replies.length, 0)
      const totalEngagements = target.analytics.reduce(
        (sum, analytics) => sum + analytics.engagementValue,
        0
      )

      const lastActivity = target.analytics.length > 0
        ? new Date(Math.max(...target.analytics.map(a => a.trackedAt.getTime())))
        : null

      return {
        targetUsername: target.targetUsername,
        totalTweets: target._count.tweets,
        repliesSent,
        engagementScore: totalEngagements,
        lastActivity,
        sentimentDistribution,
      }
    })
  }

  static async getPerformanceMetrics(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<PerformanceMetrics> {
    const { startDate, endDate } = this.getPeriodDates(period)

    // Get total engagements
    const totalEngagements = await prisma.engagementAnalytics.aggregate({
      where: {
        userId,
        trackedAt: { gte: startDate, lte: endDate },
      },
      _sum: { engagementValue: true },
    })

    // Get total replies sent
    const totalReplies = await prisma.replyQueue.count({
      where: {
        userId,
        status: 'sent',
        sentAt: { gte: startDate, lte: endDate },
      },
    })

    // Calculate response rate
    const totalTweets = await prisma.tweet.count({
      where: {
        targetUser: { userId },
        publishedAt: { gte: startDate, lte: endDate },
      },
    })

    const responseRate = totalTweets > 0 ? (totalReplies / totalTweets) * 100 : 0

    // Get top performing targets
    const topTargets = await prisma.targetUser.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            tweets: {
              where: {
                replies: {
                  some: {
                    status: 'sent',
                    sentAt: { gte: startDate, lte: endDate },
                  },
                },
              },
            },
          },
        },
        analytics: {
          where: {
            trackedAt: { gte: startDate, lte: endDate },
          },
          select: {
            engagementValue: true,
          },
        },
      },
      orderBy: {
        analytics: {
          _count: 'desc',
        },
      },
      take: 5,
    })

    const topPerformingTargets = topTargets.map(target => ({
      username: target.targetUsername,
      engagements: target.analytics.reduce(
        (sum, a) => sum + a.engagementValue,
        0
      ),
      replies: target._count.tweets,
    }))

    // Get engagement trends
    const engagementTrends = await this.getEngagementTrends(userId, startDate, endDate, period)

    return {
      period,
      totalEngagements: totalEngagements._sum.engagementValue || 0,
      responseRate,
      conversionRate: 0, // To be implemented based on business logic
      topPerformingTargets,
      engagementTrends,
    }
  }

  private static async getAverageResponseTime(
    userId: string,
    dateFilter: any
  ): Promise<number> {
    const replies = await prisma.replyQueue.findMany({
      where: {
        userId,
        status: 'sent',
        sentAt: { not: null },
        ...dateFilter,
      },
      include: {
        tweet: {
          select: {
            publishedAt: true,
          },
        },
      },
    })

    if (replies.length === 0) return 0

    const responseTimes = replies.map(reply => {
      const tweetTime = reply.tweet.publishedAt.getTime()
      const replyTime = reply.sentAt!.getTime()
      return (replyTime - tweetTime) / (1000 * 60) // in minutes
    })

    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
  }

  private static async getDailyStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; replies: number; engagements: number }>> {
    try {
      // Use Prisma-based approach instead of raw SQL to avoid column name issues
      const [repliesData, engagementsData] = await Promise.all([
        // Get daily replies using Prisma
        prisma.replyQueue.groupBy({
          by: ['sentAt'],
          where: {
            userId,
            status: 'sent',
            sentAt: {
              gte: startDate,
              lte: endDate,
              not: null
            }
          },
          _count: { id: true }
        }),
        
        // Get daily engagements using Prisma
        prisma.engagementAnalytics.groupBy({
          by: ['trackedAt'],
          where: {
            userId,
            trackedAt: {
              gte: startDate,
              lte: endDate
            }
          },
          _sum: { engagementValue: true }
        })
      ])

      // Process replies data - group by date
      const repliesMap = new Map<string, number>()
      repliesData.forEach(item => {
        if (item.sentAt) {
          const dateKey = item.sentAt.toISOString().split('T')[0]
          repliesMap.set(dateKey, (repliesMap.get(dateKey) || 0) + item._count.id)
        }
      })

      // Process engagements data - group by date
      const engagementsMap = new Map<string, number>()
      engagementsData.forEach(item => {
        const dateKey = item.trackedAt.toISOString().split('T')[0]
        engagementsMap.set(dateKey, (engagementsMap.get(dateKey) || 0) + (item._sum.engagementValue || 0))
      })

      // Merge the results
      const allDates = new Set([...repliesMap.keys(), ...engagementsMap.keys()])
      const results = Array.from(allDates).map(date => ({
        date,
        replies: repliesMap.get(date) || 0,
        engagements: engagementsMap.get(date) || 0
      })).sort((a, b) => a.date.localeCompare(b.date))

      return results

    } catch (error) {
      console.error('Error getting daily stats:', error)
      
      // Fallback: return empty array to prevent crashes
      return []
    }
  }

  private static async getEngagementTrends(
    userId: string,
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly'
  ): Promise<Array<{ date: string; engagements: number; replies: number; rate: number }>> {
    try {
      // Use Prisma-based approach for better reliability
      return this.getEngagementTrendsFallback(userId, startDate, endDate, period)
    } catch (error) {
      console.error('Error getting engagement trends:', error)
      return this.generateSampleTrends(startDate, endDate, period)
    }
  }

  /**
   * Fallback method for engagement trends when advanced SQL fails
   */
  private static async getEngagementTrendsFallback(
    userId: string,
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly'
  ): Promise<Array<{ date: string; engagements: number; replies: number; rate: number }>> {
    try {
      // Get all engagements in the date range
      const engagements = await prisma.engagementAnalytics.findMany({
        where: {
          userId,
          trackedAt: { gte: startDate, lte: endDate }
        },
        select: {
          trackedAt: true,
          engagementValue: true
        }
      })

      // Get all replies in the date range
      const replies = await prisma.replyQueue.findMany({
        where: {
          userId,
          status: 'sent',
          sentAt: { gte: startDate, lte: endDate, not: null }
        },
        select: {
          sentAt: true
        }
      })

      // Group data by period
      const trendsMap = new Map<string, { engagements: number; replies: number }>()
      
      // Process engagements
      engagements.forEach(engagement => {
        const dateKey = this.getDateKeyForPeriod(engagement.trackedAt, period)
        const existing = trendsMap.get(dateKey) || { engagements: 0, replies: 0 }
        existing.engagements += engagement.engagementValue
        trendsMap.set(dateKey, existing)
      })

      // Process replies
      replies.forEach(reply => {
        if (reply.sentAt) {
          const dateKey = this.getDateKeyForPeriod(reply.sentAt, period)
          const existing = trendsMap.get(dateKey) || { engagements: 0, replies: 0 }
          existing.replies += 1
          trendsMap.set(dateKey, existing)
        }
      })

      // Convert to array and calculate rates
      const result = Array.from(trendsMap.entries())
        .map(([date, data]) => ({
          date,
          engagements: data.engagements,
          replies: data.replies,
          rate: data.replies > 0 ? Math.round((data.engagements / data.replies) * 100) / 100 : 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Fill in missing dates with zero values
      return this.fillMissingDates(result, startDate, endDate, period)

    } catch (error) {
      console.error('Error in engagement trends fallback:', error)
      // Return minimal sample data to prevent UI crashes
      return this.generateSampleTrends(startDate, endDate, period)
    }
  }

  /**
   * Add comprehensive error handling and logging
   */
  static async getAnalyticsWithErrorHandling(
    userId: string,
    type: 'engagement' | 'target' | 'performance',
    filters: AnalyticsFilters = {},
    period: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<{
    data: any
    error?: string
    hasData: boolean
    timestamp: string
  }> {
    try {
      console.log(`📊 Getting ${type} analytics for user ${userId}`)
      
      let data: any = null
      
      switch (type) {
        case 'engagement':
          data = await this.getEngagementMetrics(userId, filters)
          break
        case 'target':
          data = await this.getTargetAnalytics(userId, filters)
          break
        case 'performance':
          data = await this.getPerformanceMetrics(userId, period)
          break
        default:
          throw new Error(`Unknown analytics type: ${type}`)
      }
      
      const hasData = this.checkHasData(data, type)
      
      console.log(`✅ Successfully retrieved ${type} analytics (hasData: ${hasData})`)
      
      return {
        data,
        hasData,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error(`❌ Error getting ${type} analytics:`, error)
      
      return {
        data: this.getEmptyDataForType(type),
        error: error instanceof Error ? error.message : 'Unknown error',
        hasData: false,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Check if analytics data contains meaningful information
   */
  private static checkHasData(data: any, type: string): boolean {
    if (!data) return false
    
    switch (type) {
      case 'engagement':
        return data.totalReplies > 0 || Object.keys(data.engagementsByType).length > 0
      case 'target':
        return Array.isArray(data) && data.length > 0 && data.some(t => t.totalTweets > 0)
      case 'performance':
        return data.totalEngagements > 0 || data.engagementTrends?.length > 0
      default:
        return false
    }
  }

  /**
   * Get empty data structure for analytics type
   */
  private static getEmptyDataForType(type: string): any {
    switch (type) {
      case 'engagement':
        return {
          totalReplies: 0,
          sentReplies: 0,
          failedReplies: 0,
          pendingReplies: 0,
          successRate: 0,
          averageResponseTime: 0,
          engagementsByType: {},
          dailyStats: []
        }
      case 'target':
        return []
      case 'performance':
        return {
          period: 'monthly',
          totalEngagements: 0,
          responseRate: 0,
          conversionRate: 0,
          topPerformingTargets: [],
          engagementTrends: []
        }
      default:
        return null
    }
  }

  /**
   * Get date key for grouping data by period
   */
  private static getDateKeyForPeriod(date: Date, period: 'daily' | 'weekly' | 'monthly'): string {
    const d = new Date(date)
    
    switch (period) {
      case 'daily':
        return d.toISOString().split('T')[0] // YYYY-MM-DD
      case 'weekly':
        // Get Monday of the week
        const dayOfWeek = d.getDay()
        const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
        const monday = new Date(d.setDate(diff))
        return monday.toISOString().split('T')[0]
      case 'monthly':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      default:
        return d.toISOString().split('T')[0]
    }
  }

  /**
   * Format date for chart display
   */
  private static formatDateForChart(date: string, period: 'daily' | 'weekly' | 'monthly'): string {
    const d = new Date(date)
    
    switch (period) {
      case 'daily':
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      case 'weekly':
        return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      case 'monthly':
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      default:
        return date
    }
  }

  /**
   * Fill in missing dates with zero values
   */
  private static fillMissingDates(
    data: Array<{ date: string; engagements: number; replies: number; rate: number }>,
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly'
  ): Array<{ date: string; engagements: number; replies: number; rate: number }> {
    const result = []
    const current = new Date(startDate)
    const dataMap = new Map(data.map(item => [item.date, item]))

    while (current <= endDate) {
      const dateKey = this.getDateKeyForPeriod(current, period)
      const existing = dataMap.get(dateKey)
      
      result.push({
        date: this.formatDateForChart(dateKey, period),
        engagements: existing?.engagements || 0,
        replies: existing?.replies || 0,
        rate: existing?.rate || 0
      })

      // Increment current date based on period
      switch (period) {
        case 'daily':
          current.setDate(current.getDate() + 1)
          break
        case 'weekly':
          current.setDate(current.getDate() + 7)
          break
        case 'monthly':
          current.setMonth(current.getMonth() + 1)
          break
      }
    }

    return result
  }

  /**
   * Generate sample trends data when all else fails
   */
  private static generateSampleTrends(
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly'
  ): Array<{ date: string; engagements: number; replies: number; rate: number }> {
    console.warn('Using sample trends data - analytics system needs data')
    
    const result = []
    const current = new Date(startDate)
    
    while (current <= endDate && result.length < 30) { // Limit to 30 data points
      result.push({
        date: this.formatDateForChart(current.toISOString().split('T')[0], period),
        engagements: 0,
        replies: 0,
        rate: 0
      })

      // Increment based on period
      switch (period) {
        case 'daily':
          current.setDate(current.getDate() + 1)
          break
        case 'weekly':
          current.setDate(current.getDate() + 7)
          break
        case 'monthly':
          current.setMonth(current.getMonth() + 1)
          break
      }
    }

    return result
  }

  private static calculateSentimentDistribution(scores: number[]): {
    positive: number
    negative: number
    neutral: number
  } {
    if (scores.length === 0) {
      return { positive: 0, negative: 0, neutral: 0 }
    }

    const positive = scores.filter(score => score > 0.1).length
    const negative = scores.filter(score => score < -0.1).length
    const neutral = scores.length - positive - negative

    const total = scores.length
    return {
      positive: (positive / total) * 100,
      negative: (negative / total) * 100,
      neutral: (neutral / total) * 100,
    }
  }

  private static buildDateFilter(
    startDate?: Date,
    endDate?: Date,
    field: string = 'createdAt'
  ): any {
    const filter: any = {}
    if (startDate || endDate) {
      filter[field] = {}
      if (startDate) filter[field].gte = startDate
      if (endDate) filter[field].lte = endDate
    }
    return filter
  }

  private static getPeriodDates(period: 'daily' | 'weekly' | 'monthly'): {
    startDate: Date
    endDate: Date
  } {
    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1)
        break
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1)
        break
    }

    return { startDate, endDate }
  }
}