import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { xApiClient } from '@/lib/x-api'

export async function POST(request: NextRequest) {
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

    // Get all active target users for this user
    const targets = await prisma.targetUser.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        xAccount: true,
      },
    })

    if (targets.length === 0) {
      return NextResponse.json({ message: 'No active targets to scrape' })
    }

    const results = []

    for (const target of targets) {
      try {
        // Get target user info from X
        const xUser = await xApiClient.getUserByUsername(target.targetUsername)
        
        // Update target user with X user ID if not set
        if (!target.targetUserId) {
          await prisma.targetUser.update({
            where: { id: target.id },
            data: { targetUserId: xUser.id },
          })
        }

        // Get the last scraped tweet ID for pagination
        const lastTweet = await prisma.tweet.findFirst({
          where: { targetUserId: target.id },
          orderBy: { publishedAt: 'desc' },
        })

        // Decrypt access token (in production, use proper decryption)
        const accessToken = Buffer.from(target.xAccount.accessToken, 'base64').toString()

        // Fetch tweets
        const tweetsResponse = await xApiClient.getUserTweets(xUser.id, {
          maxResults: 10,
          sinceId: lastTweet?.tweetId,
          accessToken,
        })

        if (tweetsResponse.data) {
          const newTweets = []

          for (const tweet of tweetsResponse.data) {
            // Check if tweet already exists
            const existingTweet = await prisma.tweet.findUnique({
              where: { tweetId: tweet.id },
            })

            if (!existingTweet) {
              const newTweet = await prisma.tweet.create({
                data: {
                  tweetId: tweet.id,
                  targetUserId: target.id,
                  content: tweet.text,
                  authorUsername: target.targetUsername,
                  publishedAt: new Date(tweet.created_at),
                  likeCount: tweet.public_metrics.like_count,
                  replyCount: tweet.public_metrics.reply_count,
                  retweetCount: tweet.public_metrics.retweet_count,
                },
              })
              newTweets.push(newTweet)
            }
          }

          // Update last scraped time
          await prisma.targetUser.update({
            where: { id: target.id },
            data: { lastScraped: new Date() },
          })

          results.push({
            target: target.targetUsername,
            newTweets: newTweets.length,
            totalFetched: tweetsResponse.data.length,
          })
        }
      } catch (error) {
        console.error(`Error scraping tweets for ${target.targetUsername}:`, error)
        results.push({
          target: target.targetUsername,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error in tweet scraping:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}