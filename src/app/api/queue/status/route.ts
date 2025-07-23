import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { QueueManager } from '@/lib/queue'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get queue statistics
    const queueStats = await QueueManager.getQueueStats()

    // Get user-specific queue counts
    const userQueueCounts = await prisma.replyQueue.groupBy({
      by: ['status'],
      where: { userId: user.id },
      _count: { status: true },
    })

    const userCounts = userQueueCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status
      return acc
    }, {} as Record<string, number>)

    // Get recent activity
    const recentReplies = await prisma.replyQueue.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        replyContent: true,
        status: true,
        scheduledFor: true,
        sentAt: true,
        createdAt: true,
        errorMessage: true,
        tweet: {
          include: {
            targetUser: {
              select: {
                targetUsername: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Get processing stats for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayStats = await prisma.replyQueue.aggregate({
      where: {
        userId: user.id,
        createdAt: { gte: today },
      },
      _count: { id: true },
    })

    const sentToday = await prisma.replyQueue.count({
      where: {
        userId: user.id,
        status: 'sent',
        sentAt: { gte: today },
      },
    })

    const failedToday = await prisma.replyQueue.count({
      where: {
        userId: user.id,
        status: 'failed',
        createdAt: { gte: today },
      },
    })

    return NextResponse.json({
      queueStats,
      userCounts: {
        pending: userCounts.pending || 0,
        sent: userCounts.sent || 0,
        failed: userCounts.failed || 0,
        cancelled: userCounts.cancelled || 0,
      },
      recentActivity: recentReplies,
      todayStats: {
        total: todayStats._count.id,
        sent: sentToday,
        failed: failedToday,
      },
    })
  } catch (error) {
    console.error('Error fetching queue status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}