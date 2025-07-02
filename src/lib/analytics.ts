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
    const dailyReplies = await prisma.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT DATE(sent_at) as date, COUNT(*) as count
      FROM reply_queue
      WHERE user_id = ${userId}
        AND status = 'sent'
        AND sent_at >= ${startDate}
        AND sent_at <= ${endDate}
      GROUP BY DATE(sent_at)
      ORDER BY date
    `

    const dailyEngagements = await prisma.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT DATE(tracked_at) as date, SUM(engagement_value) as count
      FROM engagement_analytics
      WHERE user_id = ${userId}
        AND tracked_at >= ${startDate}
        AND tracked_at <= ${endDate}
      GROUP BY DATE(tracked_at)
      ORDER BY date
    `

    // Merge the results
    const statsMap = new Map<string, { replies: number; engagements: number }>()

    dailyReplies.forEach(item => {
      const date = item.date.toString()
      statsMap.set(date, { replies: Number(item.count), engagements: 0 })
    })

    dailyEngagements.forEach(item => {
      const date = item.date.toString()
      const existing = statsMap.get(date) || { replies: 0, engagements: 0 }
      existing.engagements = Number(item.count)
      statsMap.set(date, existing)
    })

    return Array.from(statsMap.entries()).map(([date, stats]) => ({
      date,
      ...stats,
    }))
  }

  private static async getEngagementTrends(
    userId: string,
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly'
  ): Promise<Array<{ date: string; engagements: number; replies: number; rate: number }>> {
    // This would implement trend calculation based on the period
    // For now, return empty array - implement based on specific requirements
    return []
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