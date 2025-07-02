import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    const body = await request.json()
    const { targetUsername, tweets } = body

    console.log(`📝 Adding ${tweets.length} manual tweets for @${targetUsername}`)

    // Find the target user
    const targetUser = await prisma.targetUser.findFirst({
      where: {
        userId: user.id,
        targetUsername: targetUsername.toLowerCase(),
      },
    })

    if (!targetUser) {
      return NextResponse.json({ 
        error: `Target user @${targetUsername} not found. Please add them as a target first.` 
      }, { status: 400 })
    }

    let savedTweets = 0

    // Save each tweet
    for (const tweet of tweets) {
      try {
        // Generate unique ID if not provided
        const tweetId = tweet.tweetId || `manual_${targetUsername}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Check if tweet already exists
        const existingTweet = await prisma.tweet.findUnique({
          where: { tweetId },
        })

        if (!existingTweet) {
          await prisma.tweet.create({
            data: {
              tweetId,
              targetUserId: targetUser.id,
              content: tweet.content,
              authorUsername: targetUsername,
              publishedAt: new Date(tweet.publishedAt || Date.now()),
              likeCount: tweet.likeCount || 0,
              replyCount: tweet.replyCount || 0,
              retweetCount: tweet.retweetCount || 0,
              sentimentScore: tweet.sentimentScore || 0,
              scrapedAt: new Date(),
            },
          })
          savedTweets++
        }
      } catch (error) {
        console.error(`Failed to save tweet: ${tweet.content?.substring(0, 50)}...`, error)
      }
    }

    // Update target user's last scraped time
    await prisma.targetUser.update({
      where: { id: targetUser.id },
      data: { lastScraped: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: `Successfully added ${savedTweets} manual tweets for @${targetUsername}`,
      savedTweets,
      targetUsername,
    })

  } catch (error) {
    console.error('Error adding manual tweets:', error)
    return NextResponse.json(
      { 
        error: 'Failed to add manual tweets', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}