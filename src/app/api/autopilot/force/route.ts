import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST() {
  try {
    console.log('🚀 Force autopilot processing started...')

    // Get the user with autopilot enabled
    const user = await prisma.user.findFirst({
      where: {
        autopilotSettings: {
          isEnabled: true
        }
      },
      include: {
        autopilotSettings: true,
        xAccounts: {
          where: { isActive: true }
        },
        targetUsers: {
          where: { isActive: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'No users with autopilot enabled' }, { status: 404 })
    }

    console.log(`👤 Processing user: ${user.email}`)
    console.log(`🎯 Target users: ${user.targetUsers.length}`)
    console.log(`📱 X accounts: ${user.xAccounts.length}`)

    if (user.xAccounts.length === 0) {
      return NextResponse.json({ error: 'No active X accounts' }, { status: 400 })
    }

    // Get recent tweets from target users
    const maxAge = new Date(Date.now() - (user.autopilotSettings?.maxTweetAge || 1440) * 60 * 1000)
    console.log(`📅 Looking for tweets newer than: ${maxAge.toISOString()}`)

    const tweets = await prisma.tweet.findMany({
      where: {
        targetUser: {
          userId: user.id,
          isActive: true
        },
        publishedAt: { gte: maxAge },
        isDeleted: false,
        NOT: {
          replies: {
            some: {
              status: { in: ['sent', 'pending'] }
            }
          }
        }
      },
      include: {
        targetUser: true
      },
      orderBy: { publishedAt: 'desc' },
      take: 3 // Just take first 3 for testing
    })

    console.log(`🐦 Found ${tweets.length} eligible tweets`)

    if (tweets.length === 0) {
      return NextResponse.json({ 
        message: 'No eligible tweets found',
        maxAge: maxAge.toISOString(),
        targetUsers: user.targetUsers.length
      })
    }

    const results = []

    // Process each tweet
    for (const tweet of tweets) {
      console.log(`📝 Processing tweet ${tweet.tweetId} by @${tweet.authorUsername}`)
      console.log(`📄 Content: ${tweet.content.substring(0, 100)}...`)

      try {
        // Generate AI reply
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a helpful and engaging social media assistant. Generate a brief, authentic reply to the following tweet. The reply should be:
- Conversational and natural
- Under 280 characters
- Engaging but not salesy
- Relevant to the tweet content
- Use occasional emojis but not too many
- Sound human, not robotic`
            },
            {
              role: 'user',
              content: `Tweet by @${tweet.authorUsername}: "${tweet.content}"`
            }
          ],
          max_tokens: 100,
          temperature: 0.8
        })

        const replyContent = completion.choices[0]?.message?.content
        
        if (!replyContent) {
          console.log(`❌ No reply generated for tweet ${tweet.tweetId}`)
          continue
        }

        console.log(`✅ Generated reply: ${replyContent}`)

        // Calculate when to send the reply (immediate for testing)
        const scheduledFor = new Date(Date.now() + 60000) // 1 minute from now

        // Add to reply queue
        const queuedReply = await prisma.replyQueue.create({
          data: {
            userId: user.id,
            xAccountId: user.xAccounts[0].id,
            tweetId: tweet.id, // Use database ID, not Twitter ID
            replyContent,
            replyType: 'autopilot_generated',
            scheduledFor,
            status: 'pending'
          }
        })

        console.log(`✅ Reply queued with ID: ${queuedReply.id}`)

        results.push({
          tweetId: tweet.tweetId,
          authorUsername: tweet.authorUsername,
          replyContent,
          queueId: queuedReply.id,
          scheduledFor: scheduledFor.toISOString()
        })

      } catch (error) {
        console.error(`❌ Error processing tweet ${tweet.tweetId}:`, error)
        results.push({
          tweetId: tweet.tweetId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      user: user.email,
      processed: results.length,
      results
    })

  } catch (error) {
    console.error('Error in force autopilot:', error)
    return NextResponse.json(
      { error: 'Failed to process autopilot' },
      { status: 500 }
    )
  }
}