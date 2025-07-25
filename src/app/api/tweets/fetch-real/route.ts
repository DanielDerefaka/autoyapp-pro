import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
// import { XApiClient } from '@/lib/x-api'
import { rapidApiTwitterClient } from '@/lib/rapidapi-twitter'

// Comment out X API client for now - using only RapidAPI
// const xApiClient = new XApiClient({
//   apiKey: process.env.X_API_KEY!,
//   apiSecret: process.env.X_API_SECRET!,
//   bearerToken: process.env.X_BEARER_TOKEN!,
//   clientId: process.env.X_CLIENT_ID!,
//   clientSecret: process.env.X_CLIENT_SECRET!,
// })

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
    })

    if (targets.length === 0) {
      return NextResponse.json({ 
        error: 'No target users found. Please add target users first.' 
      }, { status: 400 })
    }

    const usernames = targets.map(t => t.targetUsername)
    console.log(`🚀 RapidAPI: Fetching tweets for target users: ${usernames.join(', ')}`)

    // Use only RapidAPI for now (comment out other methods)
    const results = await rapidApiTwitterClient.getMultipleUsersTweets(usernames, 10)

    let totalTweetsCreated = 0
    const targetResults = []

    // Process results and save to database
    for (const result of results) {
      if (result.error) {
        console.error(`Error for ${result.username}: ${result.error}`)
        targetResults.push({
          targetUsername: result.username,
          error: result.error,
          newTweets: 0,
          source: 'rapidapi'
        })
        continue
      }

      // Find the corresponding target user in our database
      const targetUser = targets.find(t => 
        t.targetUsername.toLowerCase() === result.username.toLowerCase()
      )

      if (!targetUser) {
        console.warn(`Target user not found in DB: ${result.username}`)
        continue
      }

      let newTweetsCount = 0

      // Save each tweet to database
      for (const tweet of result.tweets) {
        try {
          // Check if tweet already exists
          const existingTweet = await prisma.tweet.findUnique({
            where: { tweetId: tweet.tweetId },
          })

          if (!existingTweet) {
            await prisma.tweet.create({
              data: {
                tweetId: tweet.tweetId,
                targetUserId: targetUser.id,
                content: tweet.content,
                authorUsername: tweet.authorUsername,
                publishedAt: new Date(tweet.publishedAt),
                likeCount: tweet.likeCount,
                replyCount: tweet.replyCount,
                retweetCount: tweet.retweetCount,
                sentimentScore: tweet.sentimentScore,
                scrapedAt: new Date(tweet.scrapedAt),
              },
            })
            newTweetsCount++
            totalTweetsCreated++
          }
        } catch (dbError) {
          console.error(`Failed to save tweet ${tweet.tweetId}:`, dbError)
        }
      }

      
      // Update target user's last scraped time and engagement score
      await prisma.targetUser.update({
        where: { id: targetUser.id },
        data: { 
          lastScraped: new Date(),
          // Simple engagement score based on total interactions
          engagementScore: result.tweets.reduce((sum, tweet) => 
            sum + tweet.likeCount + tweet.replyCount + tweet.retweetCount, 0
          ) / Math.max(result.tweets.length, 1)
        },
      })

      targetResults.push({
        targetUsername: result.username,
        totalTweets: result.tweets.length,
        newTweets: newTweetsCount,
        latestTweet: result.tweets[0]?.content?.substring(0, 100) + '...' || 'No tweets',
        source: 'rapidapi' // Add source tracking
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully fetched tweets for ${usernames.length} target users`,
      totalNewTweets: totalTweetsCreated,
      targetResults,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching real tweets:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch tweets', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}