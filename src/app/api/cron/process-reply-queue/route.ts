import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { xApiClient } from '@/lib/x-api'
import { XTokenManager } from '@/lib/x-token-manager'

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
      userAgent.includes('internal-cron-scheduler') ||
      userAgent.includes('enhanced-tweet-scheduler') ||
      process.env.NODE_ENV === 'development'

    if (!isValidAuth) {
      console.log('❌ Reply queue authentication failed')
      console.log('Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'null')
      console.log('User agent:', userAgent)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('💬 Processing reply queue...')
    const now = new Date()

    // Get all queued replies that should be sent now
    const queuedReplies = await prisma.replyQueue.findMany({
      where: {
        status: 'pending',
        scheduledFor: {
          lte: now
        }
      },
      include: {
        user: true,
        xAccount: true,
        tweet: {
          include: {
            targetUser: true
          }
        }
      },
      orderBy: {
        scheduledFor: 'asc'
      },
      take: 10 // Process max 10 at a time to avoid timeouts
    })

    console.log(`📋 Found ${queuedReplies.length} replies to process`)

    const results = []

    for (const reply of queuedReplies) {
      try {
        console.log(`💬 Processing reply: ${reply.id} to tweet ${reply.tweet.tweetId}`)
        
        // Mark as processing to prevent duplicate processing
        await prisma.replyQueue.update({
          where: { id: reply.id },
          data: { status: 'processing' }
        })

        // Validate Twitter tweet ID format (must be numeric string)
        const twitterTweetId = reply.tweet.tweetId
        if (!twitterTweetId || !/^[0-9]{1,19}$/.test(twitterTweetId)) {
          throw new Error(`Invalid Twitter tweet ID format: ${twitterTweetId}. Expected numeric string 1-19 digits.`)
        }

        console.log(`📤 Posting reply to Twitter tweet ID: ${twitterTweetId} for @${reply.xAccount.username}`)

        // Post reply with automatic token refresh handling
        const response = await XTokenManager.withTokenRefresh(
          reply.xAccount.id,
          async (accessToken: string) => {
            return await xApiClient.postTweet(reply.replyContent, {
              replyToTweetId: twitterTweetId, // This is the actual Twitter tweet ID (numeric string)
              accessToken: accessToken
            })
          }
        )

        // Mark as sent
        await prisma.replyQueue.update({
          where: { id: reply.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
            errorMessage: null
          }
        })

        // Log analytics
        await prisma.engagementAnalytics.create({
          data: {
            userId: reply.userId,
            targetUserId: reply.tweet.targetUser?.id,
            replyId: reply.id,
            engagementType: 'reply',
            engagementValue: 1,
            trackedAt: new Date()
          }
        })

        results.push({
          replyId: reply.id,
          status: 'sent',
          tweetId: response.data.id,
          targetUser: reply.tweet.targetUser?.targetUsername
        })

        console.log(`✅ Successfully sent reply: ${reply.id} -> ${response.data.id}`)

        // Add small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ Failed to send reply ${reply.id}:`, error)
        
        // Mark as failed with retry logic
        const retryCount = reply.retryCount + 1
        const maxRetries = 3
        
        if (retryCount <= maxRetries) {
          // Schedule for retry in 5 minutes
          const retryTime = new Date(Date.now() + 5 * 60 * 1000)
          
          await prisma.replyQueue.update({
            where: { id: reply.id },
            data: {
              status: 'pending',
              retryCount: retryCount,
              scheduledFor: retryTime,
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          })
          
          console.log(`🔄 Scheduled retry ${retryCount}/${maxRetries} for reply ${reply.id}`)
          
          results.push({
            replyId: reply.id,
            status: 'retry_scheduled',
            retryCount,
            nextRetry: retryTime.toISOString()
          })
        } else {
          // Max retries reached, mark as failed
          await prisma.replyQueue.update({
            where: { id: reply.id },
            data: {
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Max retries exceeded'
            }
          })
          
          results.push({
            replyId: reply.id,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Max retries exceeded'
          })
        }
      }
    }

    console.log(`✅ Processed ${results.length} queued replies`)

    // Update queue statistics
    const queueStats = await prisma.replyQueue.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      queueStats: queueStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status
        return acc
      }, {} as Record<string, number>)
    })

  } catch (error) {
    console.error('Error processing reply queue:', error)
    return NextResponse.json(
      { error: 'Failed to process reply queue' },
      { status: 500 }
    )
  }
}