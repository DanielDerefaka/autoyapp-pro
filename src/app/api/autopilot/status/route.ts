import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const authResult = await auth()
    const clerkId = authResult?.userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        autopilotSettings: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get today's stats
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startOfHour = new Date(today.getFullYear(), today.getMonth(), today.getDate(), today.getHours())

    const [
      todayRepliesSent,
      todayTargetsMonitored,
      todayTweetsProcessed,
      queueStats,
      recentActivity,
      lastRun
    ] = await Promise.all([
      // Today's replies sent
      prisma.replyQueue.count({
        where: {
          userId: user.id,
          status: 'sent',
          createdAt: { gte: startOfDay }
        }
      }),
      
      // Active target users
      prisma.targetUser.count({
        where: {
          userId: user.id,
          isActive: true
        }
      }),
      
      // Today's tweets analyzed
      prisma.tweet.count({
        where: {
          targetUser: { userId: user.id },
          scrapedAt: { gte: startOfDay }
        }
      }),
      
      // Queue statistics
      prisma.replyQueue.groupBy({
        by: ['status'],
        where: { userId: user.id },
        _count: true
      }),
      
      // Recent activity (last 10 actions)
      prisma.replyQueue.findMany({
        where: { userId: user.id },
        include: {
          tweet: {
            include: {
              targetUser: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      
      // Last autopilot run (most recent reply created)
      prisma.replyQueue.findFirst({
        where: {
          userId: user.id,
          replyType: 'autopilot_generated'
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ])

    // Process queue stats
    const queueStatsFormatted = {
      pending: queueStats.find(s => s.status === 'pending')?._count || 0,
      scheduled: queueStats.find(s => s.status === 'pending')?._count || 0, // Pending includes scheduled
      failed: queueStats.find(s => s.status === 'failed')?._count || 0,
      sent: queueStats.find(s => s.status === 'sent')?._count || 0
    }

    // Format recent activity
    const recentActivityFormatted = recentActivity.map(reply => {
      let action = 'Unknown'
      let details = ''
      let status: 'success' | 'warning' | 'error' = 'success'

      switch (reply.status) {
        case 'sent':
          action = 'Reply sent'
          details = `Replied to @${reply.tweet?.authorUsername || 'unknown'}`
          status = 'success'
          break
        case 'pending':
          action = 'Reply scheduled'
          details = `Scheduled reply to @${reply.tweet?.authorUsername || 'unknown'}`
          status = 'warning'
          break
        case 'failed':
          action = 'Reply failed'
          details = reply.errorMessage || 'Unknown error'
          status = 'error'
          break
        case 'cancelled':
          action = 'Reply cancelled'
          details = reply.errorMessage || 'Cancelled by user'
          status = 'warning'
          break
      }

      return {
        id: reply.id,
        action,
        timestamp: reply.createdAt.toISOString(),
        details,
        status
      }
    })

    // Calculate next run time (simplified - every 15 minutes)
    const nextRun = new Date(Date.now() + 15 * 60 * 1000)

    const autopilotStatus = {
      isEnabled: user.autopilotSettings?.isEnabled || false,
      isActive: user.autopilotSettings?.isEnabled || false,
      lastRun: lastRun?.createdAt?.toISOString() || null,
      nextRun: nextRun.toISOString(),
      todayStats: {
        repliesSent: todayRepliesSent,
        maxReplies: user.autopilotSettings?.maxRepliesPerDay || 30,
        targetsMonitored: todayTargetsMonitored,
        tweetsProcessed: todayTweetsProcessed
      },
      recentActivity: recentActivityFormatted,
      queueStats: queueStatsFormatted
    }

    return NextResponse.json(autopilotStatus)

  } catch (error) {
    console.error('Error fetching autopilot status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch autopilot status' },
      { status: 500 }
    )
  }
}