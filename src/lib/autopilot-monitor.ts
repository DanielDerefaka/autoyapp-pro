import { prisma } from './prisma'

interface SafetyAlert {
  userId: string
  alertType: 'rate_limit' | 'block_detected' | 'compliance_violation' | 'account_suspended'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details: any
}

interface AutopilotMetrics {
  userId: string
  date: string
  repliesSent: number
  repliesScheduled: number
  repliesFailed: number
  tweetsAnalyzed: number
  complianceScore: number
  averageResponseTime: number
}

export class AutopilotMonitor {
  /**
   * Check autopilot health for all active users
   */
  async checkAutopilotHealth(): Promise<void> {
    console.log('🩺 Running autopilot health check...')

    try {
      // Get all users with active autopilot
      const activeUsers = await prisma.user.findMany({
        where: {
          autopilotSettings: {
            isEnabled: true
          }
        },
        include: {
          autopilotSettings: true,
          xAccounts: {
            where: { isActive: true }
          }
        }
      })

      console.log(`👥 Checking health for ${activeUsers.length} active autopilot users`)

      for (const user of activeUsers) {
        await this.checkUserHealth(user)
      }

    } catch (error) {
      console.error('❌ Error in autopilot health check:', error)
    }
  }

  /**
   * Check individual user's autopilot health
   */
  private async checkUserHealth(user: any): Promise<void> {
    try {
      // Check rate limit compliance
      await this.checkRateLimits(user)

      // Check for blocks or suspensions
      await this.checkAccountStatus(user)

      // Check queue health
      await this.checkQueueHealth(user)

      // Check compliance score
      await this.checkComplianceScore(user)

    } catch (error) {
      console.error(`❌ Error checking health for user ${user.id}:`, error)
    }
  }

  /**
   * Check if user is approaching or exceeding rate limits
   */
  private async checkRateLimits(user: any): Promise<void> {
    const settings = user.autopilotSettings
    if (!settings) return

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())

    // Get current usage
    const [dailyCount, hourlyCount] = await Promise.all([
      prisma.replyQueue.count({
        where: {
          userId: user.id,
          createdAt: { gte: startOfDay },
          status: { in: ['sent', 'pending'] }
        }
      }),
      prisma.replyQueue.count({
        where: {
          userId: user.id,
          createdAt: { gte: startOfHour },
          status: { in: ['sent', 'pending'] }
        }
      })
    ])

    // Check daily limit
    const dailyUsagePercent = (dailyCount / settings.maxRepliesPerDay) * 100
    if (dailyUsagePercent >= 90) {
      await this.createSafetyAlert({
        userId: user.id,
        alertType: 'rate_limit',
        severity: dailyUsagePercent >= 100 ? 'critical' : 'high',
        message: `Daily rate limit ${dailyUsagePercent >= 100 ? 'exceeded' : 'warning'}`,
        details: {
          dailyCount,
          maxDaily: settings.maxRepliesPerDay,
          usagePercent: dailyUsagePercent
        }
      })

      if (dailyUsagePercent >= 100) {
        console.log(`⚠️ User ${user.id} exceeded daily rate limit, pausing autopilot`)
        await this.pauseAutopilot(user.id, 'Daily rate limit exceeded')
      }
    }

    // Check hourly limit
    const hourlyUsagePercent = (hourlyCount / settings.maxRepliesPerHour) * 100
    if (hourlyUsagePercent >= 90) {
      await this.createSafetyAlert({
        userId: user.id,
        alertType: 'rate_limit',
        severity: hourlyUsagePercent >= 100 ? 'critical' : 'medium',
        message: `Hourly rate limit ${hourlyUsagePercent >= 100 ? 'exceeded' : 'warning'}`,
        details: {
          hourlyCount,
          maxHourly: settings.maxRepliesPerHour,
          usagePercent: hourlyUsagePercent
        }
      })
    }
  }

  /**
   * Check account status for blocks or suspensions
   */
  private async checkAccountStatus(user: any): Promise<void> {
    // Check recent failed replies for block indicators
    const recentFailures = await prisma.replyQueue.findMany({
      where: {
        userId: user.id,
        status: 'failed',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      },
      take: 10
    })

    // Look for patterns indicating blocks
    const blockIndicators = recentFailures.filter(failure => 
      failure.errorMessage?.toLowerCase().includes('blocked') ||
      failure.errorMessage?.toLowerCase().includes('suspended') ||
      failure.errorMessage?.toLowerCase().includes('forbidden')
    )

    if (blockIndicators.length >= 3) {
      await this.createSafetyAlert({
        userId: user.id,
        alertType: 'block_detected',
        severity: 'critical',
        message: 'Possible account block or suspension detected',
        details: {
          failureCount: blockIndicators.length,
          recentErrors: blockIndicators.map(f => f.errorMessage)
        }
      })

      console.log(`🚨 User ${user.id} may be blocked, pausing autopilot`)
      await this.pauseAutopilot(user.id, 'Possible account block detected')
    }
  }

  /**
   * Check queue health for stuck or failing jobs
   */
  private async checkQueueHealth(user: any): Promise<void> {
    // Check for old pending replies (stuck jobs)
    const stuckReplies = await prisma.replyQueue.count({
      where: {
        userId: user.id,
        status: 'pending',
        scheduledFor: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } // 2 hours ago
      }
    })

    if (stuckReplies > 5) {
      await this.createSafetyAlert({
        userId: user.id,
        alertType: 'compliance_violation',
        severity: 'medium',
        message: 'Multiple stuck replies detected in queue',
        details: {
          stuckCount: stuckReplies
        }
      })
    }

    // Check failure rate
    const totalReplies = await prisma.replyQueue.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    const failedReplies = await prisma.replyQueue.count({
      where: {
        userId: user.id,
        status: 'failed',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    if (totalReplies > 0) {
      const failureRate = (failedReplies / totalReplies) * 100
      if (failureRate > 50) {
        await this.createSafetyAlert({
          userId: user.id,
          alertType: 'compliance_violation',
          severity: 'high',
          message: 'High failure rate detected',
          details: {
            failureRate,
            totalReplies,
            failedReplies
          }
        })
      }
    }
  }

  /**
   * Calculate and check compliance score
   */
  private async checkComplianceScore(user: any): Promise<void> {
    const score = await this.calculateComplianceScore(user.id)
    
    if (score < 70) {
      await this.createSafetyAlert({
        userId: user.id,
        alertType: 'compliance_violation',
        severity: score < 50 ? 'critical' : 'high',
        message: `Low compliance score: ${score}%`,
        details: { complianceScore: score }
      })

      if (score < 50) {
        console.log(`⚠️ User ${user.id} has critical compliance score (${score}%), pausing autopilot`)
        await this.pauseAutopilot(user.id, `Critical compliance score: ${score}%`)
      }
    }
  }

  /**
   * Calculate compliance score based on multiple factors
   */
  private async calculateComplianceScore(userId: string): Promise<number> {
    const settings = await prisma.autopilotSettings.findUnique({
      where: { userId }
    })

    if (!settings) return 0

    let score = 100

    // Rate limit compliance (30 points)
    const dailyUsage = await this.getDailyUsage(userId)
    const dailyCompliance = Math.max(0, 100 - (dailyUsage.usage / dailyUsage.limit * 100))
    score -= (100 - dailyCompliance) * 0.3

    // Response timing compliance (20 points)
    const timingCompliance = await this.getTimingCompliance(userId)
    score -= (100 - timingCompliance) * 0.2

    // Content quality compliance (25 points)
    const contentCompliance = await this.getContentCompliance(userId)
    score -= (100 - contentCompliance) * 0.25

    // Account health compliance (25 points)
    const accountCompliance = await this.getAccountHealthCompliance(userId)
    score -= (100 - accountCompliance) * 0.25

    return Math.max(0, Math.round(score))
  }

  /**
   * Get daily usage stats
   */
  private async getDailyUsage(userId: string): Promise<{ usage: number, limit: number }> {
    const settings = await prisma.autopilotSettings.findUnique({
      where: { userId }
    })

    if (!settings) return { usage: 0, limit: 1 }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const usage = await prisma.replyQueue.count({
      where: {
        userId,
        createdAt: { gte: startOfDay },
        status: { in: ['sent', 'pending'] }
      }
    })

    return { usage, limit: settings.maxRepliesPerDay }
  }

  /**
   * Check timing compliance (delays between replies)
   */
  private async getTimingCompliance(userId: string): Promise<number> {
    // Implementation would check if delays are being respected
    // For now, return a base score
    return 85
  }

  /**
   * Check content quality compliance
   */
  private async getContentCompliance(userId: string): Promise<number> {
    // Implementation would analyze reply content quality
    // For now, return a base score
    return 90
  }

  /**
   * Check account health compliance
   */
  private async getAccountHealthCompliance(userId: string): Promise<number> {
    const recentFailures = await prisma.replyQueue.count({
      where: {
        userId,
        status: 'failed',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    // Base score minus failures
    return Math.max(0, 100 - (recentFailures * 10))
  }

  /**
   * Create a safety alert
   */
  private async createSafetyAlert(alert: SafetyAlert): Promise<void> {
    try {
      await prisma.complianceLog.create({
        data: {
          userId: alert.userId,
          actionType: alert.alertType,
          complianceStatus: alert.severity === 'critical' ? 'violation' : 'warning',
          details: {
            message: alert.message,
            severity: alert.severity,
            ...alert.details
          }
        }
      })

      console.log(`🚨 Safety alert created for user ${alert.userId}: ${alert.message}`)

      // Send email notification if enabled
      if (alert.severity === 'critical' || alert.severity === 'high') {
        await this.sendAlertNotification(alert)
      }

    } catch (error) {
      console.error('Error creating safety alert:', error)
    }
  }

  /**
   * Send alert notification via email
   */
  private async sendAlertNotification(alert: SafetyAlert): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: alert.userId },
        include: { autopilotSettings: true }
      })

      if (!user?.autopilotSettings?.notifyOnPause) {
        return // User doesn't want notifications
      }

      // Here you would integrate with your email service (Resend, etc.)
      console.log(`📧 Would send alert email to ${user.email}: ${alert.message}`)

    } catch (error) {
      console.error('Error sending alert notification:', error)
    }
  }

  /**
   * Pause autopilot for a user
   */
  private async pauseAutopilot(userId: string, reason: string): Promise<void> {
    try {
      await prisma.autopilotSettings.update({
        where: { userId },
        data: { isEnabled: false }
      })

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
   * Generate daily metrics for a user
   */
  async generateDailyMetrics(userId: string): Promise<AutopilotMetrics | null> {
    try {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

      const [sent, scheduled, failed, tweets] = await Promise.all([
        prisma.replyQueue.count({
          where: {
            userId,
            status: 'sent',
            createdAt: { gte: startOfDay, lt: endOfDay }
          }
        }),
        prisma.replyQueue.count({
          where: {
            userId,
            status: 'pending',
            createdAt: { gte: startOfDay, lt: endOfDay }
          }
        }),
        prisma.replyQueue.count({
          where: {
            userId,
            status: 'failed',
            createdAt: { gte: startOfDay, lt: endOfDay }
          }
        }),
        prisma.tweet.count({
          where: {
            targetUser: { userId },
            scrapedAt: { gte: startOfDay, lt: endOfDay }
          }
        })
      ])

      const complianceScore = await this.calculateComplianceScore(userId)

      return {
        userId,
        date: startOfDay.toISOString().split('T')[0],
        repliesSent: sent,
        repliesScheduled: scheduled,
        repliesFailed: failed,
        tweetsAnalyzed: tweets,
        complianceScore,
        averageResponseTime: 0 // Would calculate from actual timing data
      }

    } catch (error) {
      console.error(`Error generating metrics for user ${userId}:`, error)
      return null
    }
  }
}

export const autopilotMonitor = new AutopilotMonitor()