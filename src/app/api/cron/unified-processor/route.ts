import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { xApiClient } from '@/lib/x-api'
import { XTokenManager } from '@/lib/x-token-manager'

// Handle both GET and POST requests for cron services
async function handleRequest(request: NextRequest) {
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
      console.log('❌ Unified processor authentication failed')
      console.log('Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'null')
      console.log('User agent:', userAgent)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🚀 Unified processor started - handling replies, scheduled tweets, and token refresh...')
    const now = new Date()
    const results: any = {
      replies: { processed: 0, errors: 0 },
      scheduledTweets: { processed: 0, errors: 0 },
      tokenRefresh: { refreshed: 0, errors: 0 },
      startTime: now.toISOString()
    }

    // 1. PROCESS REPLY QUEUE
    console.log('💬 Processing reply queue...')
    try {
      const queuedReplies = await prisma.replyQueue.findMany({
        where: {
          status: 'pending',
          scheduledFor: { lte: now }
        },
        include: {
          user: true,
          xAccount: true,
          tweet: { include: { targetUser: true } }
        },
        orderBy: { scheduledFor: 'asc' },
        take: 5 // Limit to 5 replies per run to avoid timeouts
      })

      console.log(`📋 Found ${queuedReplies.length} replies to process`)

      for (const reply of queuedReplies) {
        try {
          console.log(`💬 Processing reply: ${reply.id} to tweet ${reply.tweet.tweetId}`)
          
          await prisma.replyQueue.update({
            where: { id: reply.id },
            data: { status: 'processing' }
          })

          const twitterTweetId = reply.tweet.tweetId
          if (!twitterTweetId || !/^[0-9]{1,19}$/.test(twitterTweetId)) {
            throw new Error(`Invalid Twitter tweet ID format: ${twitterTweetId}`)
          }

          const response = await XTokenManager.withTokenRefresh(
            reply.xAccount.id,
            async (accessToken: string) => {
              return await xApiClient.postTweet(reply.replyContent, {
                replyToTweetId: twitterTweetId,
                accessToken: accessToken
              })
            }
          )

          await prisma.replyQueue.update({
            where: { id: reply.id },
            data: {
              status: 'sent',
              sentAt: new Date(),
              errorMessage: null
            }
          })

          await prisma.engagementAnalytics.create({
            data: {
              userId: reply.userId,
              targetUserId: reply.tweet.targetUser.id,
              replyId: reply.id,
              engagementType: 'ai_reply_sent',
              engagementValue: 1,
              trackedAt: new Date()
            }
          })

          results.replies.processed++
          console.log(`✅ Reply sent successfully: ${reply.id}`)

        } catch (error) {
          console.error(`❌ Failed to send reply ${reply.id}:`, error)
          
          await prisma.replyQueue.update({
            where: { id: reply.id },
            data: {
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          })

          results.replies.errors++
        }
      }
    } catch (error) {
      console.error('❌ Error in reply queue processing:', error)
      results.replies.errors++
    }

    // 2. PROCESS SCHEDULED TWEETS (Every 10 minutes - check if it's time)
    const currentMinute = now.getMinutes()
    if (currentMinute % 10 === 0) {
      console.log('🕐 Processing scheduled tweets...')
      try {
        const scheduledContent = await prisma.scheduledContent.findMany({
          where: {
            status: 'scheduled',
            scheduledFor: { lte: now }
          },
          include: {
            user: true,
            xAccount: true
          },
          orderBy: { scheduledFor: 'asc' },
          take: 3 // Limit to avoid timeouts
        })

        console.log(`📋 Found ${scheduledContent.length} scheduled items to process`)

        for (const content of scheduledContent) {
          try {
            console.log(`📤 Processing scheduled content: ${content.id}`)
            
            const tweets = JSON.parse(content.content)
            
            await prisma.scheduledContent.update({
              where: { id: content.id },
              data: { status: 'processing' }
            })

            const publishedTweets = []
            let lastTweetId: string | undefined = undefined

            for (let i = 0; i < tweets.length; i++) {
              const tweet = tweets[i]
              
              const response = await XTokenManager.withTokenRefresh(
                content.xAccount.id,
                async (accessToken: string) => {
                  return await xApiClient.postTweet(tweet.content, {
                    replyToTweetId: lastTweetId,
                    accessToken: accessToken
                  })
                }
              )
              
              publishedTweets.push({
                id: response.data.id,
                content: response.data.text,
                publishedAt: new Date()
              })
              
              lastTweetId = response.data.id
              
              if (i < tweets.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000))
              }
            }

            await prisma.scheduledContent.update({
              where: { id: content.id },
              data: {
                status: 'published',
                publishedAt: new Date(),
                errorMessage: null
              }
            })

            await prisma.engagementAnalytics.create({
              data: {
                userId: content.userId,
                engagementType: 'scheduled_tweet_published',
                engagementValue: tweets.length,
                trackedAt: new Date()
              }
            })

            results.scheduledTweets.processed++
            console.log(`✅ Scheduled content published: ${content.id}`)

          } catch (error) {
            console.error(`❌ Failed to publish scheduled content ${content.id}:`, error)
            
            await prisma.scheduledContent.update({
              where: { id: content.id },
              data: {
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
              }
            })

            results.scheduledTweets.errors++
          }
        }
      } catch (error) {
        console.error('❌ Error in scheduled tweets processing:', error)
        results.scheduledTweets.errors++
      }
    }

    // 3. PROACTIVE TOKEN REFRESH (Every 30 minutes)
    if (currentMinute % 30 === 0) {
      console.log('🔄 Proactive token refresh...')
      try {
        const accountsNeedingRefresh = await XTokenManager.getAccountsNeedingRefresh()
        console.log(`📋 Found ${accountsNeedingRefresh.length} accounts that may need token refresh`)

        for (const accountId of accountsNeedingRefresh.slice(0, 3)) { // Limit to 3 to avoid timeouts
          try {
            const account = await prisma.xAccount.findUnique({
              where: { id: accountId },
              select: { username: true }
            })

            if (account) {
              await XTokenManager.withTokenRefresh(
                accountId,
                async (accessToken: string) => {
                  // Simple test call to verify token
                  const response = await fetch('https://api.twitter.com/2/users/me', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                  })
                  if (!response.ok) throw new Error(`Token test failed: ${response.status}`)
                  return await response.json()
                }
              )

              results.tokenRefresh.refreshed++
              console.log(`✅ Token refreshed for @${account.username}`)
            }
          } catch (error) {
            console.error(`❌ Token refresh failed for account ${accountId}:`, error)
            results.tokenRefresh.errors++
          }
        }
      } catch (error) {
        console.error('❌ Error in token refresh:', error)
        results.tokenRefresh.errors++
      }
    }

    const endTime = new Date()
    const duration = endTime.getTime() - now.getTime()

    console.log(`✅ Unified processor completed in ${duration}ms`)
    console.log(`📊 Results: Replies(${results.replies.processed}/${results.replies.errors}), Scheduled(${results.scheduledTweets.processed}/${results.scheduledTweets.errors}), Tokens(${results.tokenRefresh.refreshed}/${results.tokenRefresh.errors})`)

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results,
      endTime: endTime.toISOString()
    })

  } catch (error) {
    console.error('Error in unified processor:', error)
    return NextResponse.json(
      { error: 'Unified processor failed' },
      { status: 500 }
    )
  }
}

// Export both GET and POST handlers for maximum compatibility
export async function GET(request: NextRequest) {
  return handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handleRequest(request)
}