import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { QueueManager } from '@/lib/queue'
import { DatabaseQueue } from '@/lib/database-queue'

export async function POST(request: NextRequest) {
  try {
    // Flexible authentication for various cron services
    const authHeader = request.headers.get('authorization')
    const userAgent = request.headers.get('user-agent') || ''
    const cronSecret = process.env.CRON_SECRET || 'dev_cron_secret_12345'

    const isValidAuth = 
      authHeader === `Bearer ${cronSecret}` || 
      userAgent.includes('UptimeRobot') ||
      userAgent.includes('vercel-cron') ||
      userAgent.includes('internal-cron-heartbeat') ||
      process.env.NODE_ENV === 'development'

    if (!isValidAuth) {
      console.log('❌ Queue processing authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Processing reply queue...')

    // Try Redis-based queue first, fallback to database queue
    let processed = 0
    let failed = 0
    let method = 'unknown'

    try {
      // Check if Redis queue is available
      const queueStats = await QueueManager.getQueueStats()
      
      if (queueStats.replies.waiting > 0 || queueStats.replies.active > 0) {
        // Redis queue is working, process via QueueManager
        console.log('📊 Using Redis queue processing')
        method = 'redis'
        
        // Get pending replies for Redis processing
        const pendingReplies = await prisma.replyQueue.findMany({
          where: {
            status: 'pending',
            scheduledFor: {
              lte: new Date(),
            },
            retryCount: { lt: 3 }
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
          take: 50,
        })

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
      } else {
        throw new Error('Redis queue not available or empty')
      }
    } catch (redisError) {
      // Redis failed, use database queue fallback
      console.log('📊 Redis queue unavailable, using database queue fallback')
      console.log('Redis error:', redisError)
      method = 'database'

      // Initialize database queue if needed
      await DatabaseQueue.initialize()

      // Process pending replies from database directly
      const databaseResults = await DatabaseQueue.processReplyJobs()
      processed = databaseResults.processed
      failed = databaseResults.failed

      // Also queue any pending replies from the main table into the database queue
      const pendingReplies = await prisma.replyQueue.findMany({
        where: {
          status: 'pending',
          scheduledFor: {
            lte: new Date(),
          },
          retryCount: { lt: 3 }
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
        take: 20, // Smaller batch for database processing
      })

      // Add these replies to the database queue for processing
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

          await DatabaseQueue.addReplyJob({
            replyId: reply.id,
            userId: reply.userId,
            xAccountId: reply.xAccountId,
            tweetId: reply.tweetId,
            replyContent: reply.replyContent,
            scheduledFor: reply.scheduledFor.toISOString(),
          })
          
          console.log(`📝 Added reply ${reply.id} to database queue`)
        } catch (error) {
          console.error(`Failed to add reply ${reply.id} to database queue:`, error)
        }
      }
    }

    // Clean up old processed jobs periodically
    if (Math.random() < 0.1) { // 10% chance to run cleanup
      try {
        const cleaned = await DatabaseQueue.cleanup(7) // 7 days old
        if (cleaned > 0) {
          console.log(`🧹 Cleaned up ${cleaned} old queue jobs`)
        }
      } catch (cleanupError) {
        console.error('Queue cleanup failed:', cleanupError)
      }
    }

    console.log(`✅ Queue processing completed: ${processed} processed, ${failed} failed (method: ${method})`)

    return NextResponse.json({
      success: true,
      processed,
      failed,
      method,
      totalFound: processed + failed,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in process-queue cron:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}