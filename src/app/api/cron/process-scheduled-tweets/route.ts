import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { xApiClient } from '@/lib/x-api'
import { XTokenManager } from '@/lib/x-token-manager'
import { twitterCircuitBreakers } from '@/lib/circuit-breaker'

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
      console.log('❌ Scheduled tweets authentication failed')
      console.log('Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'null')
      console.log('User agent:', userAgent)
      console.log('💡 For testing: curl -X POST http://localhost:3000/api/cron/process-scheduled-tweets -H "Authorization: Bearer dev_cron_secret_12345"')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Processing scheduled tweets...')
    const now = new Date()

    // Get a limited number of scheduled content to process (prevent timeout)
    const scheduledContent = await prisma.scheduledContent.findMany({
      where: {
        status: 'scheduled',
        scheduledFor: {
          lte: now
        }
      },
      include: {
        user: {
          select: { id: true, clerkId: true }
        },
        xAccount: {
          select: { id: true, username: true, accessToken: true, refreshToken: true, isActive: true }
        }
      },
      orderBy: {
        scheduledFor: 'asc'
      },
      take: 5 // Process max 5 items at a time to prevent timeout
    })

    console.log(`📋 Found ${scheduledContent.length} items to process`)

    const results = []

    for (const content of scheduledContent) {
      try {
        console.log(`📤 Processing scheduled content: ${content.id}`)
        
        // Parse the content JSON
        const tweets = JSON.parse(content.content)
        
        // Mark as processing to prevent duplicate processing
        await prisma.scheduledContent.update({
          where: { id: content.id },
          data: { 
            status: 'processing',
            updatedAt: new Date()
          }
        })

        const publishedTweets = []
        let lastTweetId: string | undefined = undefined

        // Publish each tweet in the content with automatic token refresh
        for (let i = 0; i < tweets.length; i++) {
          const tweet = tweets[i]
          
          console.log(`📤 Publishing tweet ${i + 1}/${tweets.length} for @${content.xAccount.username}`)
          
          try {
            // Post to X API with automatic token refresh handling and circuit breaker
            const response = await twitterCircuitBreakers.postTweet.execute(async () => {
              return await XTokenManager.withTokenRefresh(
                content.xAccount.id,
                async (accessToken: string) => {
                  return await xApiClient.postTweet(tweet.content, {
                    replyToTweetId: lastTweetId, // For threads
                    accessToken: accessToken,
                    userId: content.user.id
                  })
                }
              )
            })
            
            publishedTweets.push({
              id: response.data.id,
              content: response.data.text,
              publishedAt: new Date()
            })
            
            lastTweetId = response.data.id
            console.log(`✅ Published tweet ${i + 1}: ${response.data.id}`)
            
            // Add delay between tweets in a thread
            if (i < tweets.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000))
            }
          } catch (tweetError) {
            console.error(`❌ Failed to publish tweet ${i + 1}:`, tweetError)
            throw tweetError
          }
        }

        // Mark as published
        await prisma.scheduledContent.update({
          where: { id: content.id },
          data: {
            status: 'published',
            publishedAt: new Date(),
            errorMessage: null
          }
        })

        // Log analytics
        await prisma.engagementAnalytics.create({
          data: {
            userId: content.userId,
            engagementType: 'scheduled_tweet_published',
            engagementValue: tweets.length,
            trackedAt: new Date()
          }
        })

        results.push({
          contentId: content.id,
          status: 'published',
          tweetsPublished: publishedTweets.length,
          publishedTweets
        })

        console.log(`🎉 Successfully published scheduled content: ${content.id}`)

      } catch (error) {
        console.error(`❌ Failed to publish scheduled content ${content.id}:`, error)
        
        // Check if it's a circuit breaker error
        const isCircuitBreakerError = error instanceof Error && error.message.includes('Circuit breaker is OPEN')
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        if (isCircuitBreakerError) {
          console.log('⚡ Circuit breaker is open, scheduling retry for later')
          // Reschedule for 10 minutes later instead of marking as failed
          await prisma.scheduledContent.update({
            where: { id: content.id },
            data: {
              status: 'scheduled',
              scheduledFor: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes later
              errorMessage: errorMessage
            }
          })
          
          results.push({
            contentId: content.id,
            status: 'rescheduled',
            reason: 'circuit_breaker_open',
            nextAttempt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
          })
        } else {
          // Mark as failed
          await prisma.scheduledContent.update({
            where: { id: content.id },
            data: {
              status: 'failed',
              errorMessage: errorMessage
            }
          })

          results.push({
            contentId: content.id,
            status: 'failed',
            error: errorMessage
          })
        }
      }
    }

    console.log(`✅ Processed ${results.length} scheduled items`)

    // Log circuit breaker states
    const circuitBreakerStates = {
      postTweet: twitterCircuitBreakers.postTweet.getState(),
      tokenRefresh: twitterCircuitBreakers.tokenRefresh.getState(),
      userLookup: twitterCircuitBreakers.userLookup.getState()
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      circuitBreakerStates
    })

  } catch (error) {
    console.error('Error processing scheduled tweets:', error)
    return NextResponse.json(
      { error: 'Failed to process scheduled tweets' },
      { status: 500 }
    )
  }
}