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
        retryCount: { lt: 3 } // Max 3 retry attempts
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
      take: 50, // Process in batches
    })

    let processed = 0
    let failed = 0

    for (const reply of pendingReplies) {
      try {
        // Safety check: If this is an autopilot reply, ensure autopilot is still enabled
        if (reply.replyType === 'autopilot_generated') {
          if (!reply.user?.autopilotSettings?.isEnabled) {
            // Cancel autopilot replies if autopilot is disabled
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
        
        // Increment retry count
        const newRetryCount = (reply.retryCount || 0) + 1
        await prisma.replyQueue.update({
          where: { id: reply.id },
          data: {
            retryCount: newRetryCount,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            status: newRetryCount >= 3 ? 'failed' : 'pending',
            // Reschedule for retry with exponential backoff
            scheduledFor: newRetryCount < 3 
              ? new Date(Date.now() + Math.pow(2, newRetryCount) * 60000) // 2^n minutes
              : reply.scheduledFor
          }
        })
        
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