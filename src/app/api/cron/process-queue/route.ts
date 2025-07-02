import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { QueueManager } from '@/lib/queue'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending replies that are ready to be sent
    const pendingReplies = await prisma.replyQueue.findMany({
      where: {
        status: 'pending',
        scheduledFor: {
          lte: new Date(),
        },
      },
      include: {
        tweet: true,
        xAccount: true,
      },
      take: 50, // Process in batches
    })

    let processed = 0
    let failed = 0

    for (const reply of pendingReplies) {
      try {
        await QueueManager.addReplyJob({
          replyId: reply.id,
          userId: reply.userId,
          xAccountId: reply.xAccountId,
          tweetId: reply.tweetId,
          replyContent: reply.replyContent,
          scheduledFor: reply.scheduledFor.toISOString(),
        })
        processed++
      } catch (error) {
        console.error(`Failed to queue reply ${reply.id}:`, error)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
      totalFound: pendingReplies.length,
    })
  } catch (error) {
    console.error('Error in process-queue cron:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}