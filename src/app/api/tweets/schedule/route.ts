import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const authResult = await auth()
    const clerkId = authResult?.userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tweets, scheduledFor } = await request.json()

    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      console.log('❌ Tweets array is required', tweets)
      return NextResponse.json({ error: 'Tweets array is required' }, { status: 400 })
    }

    if (!scheduledFor) {
      console.log('❌ Scheduled time is required', scheduledFor)
      return NextResponse.json({ error: 'Scheduled time is required' }, { status: 400 })
    }

    const scheduledDate = new Date(scheduledFor)
    if (scheduledDate <= new Date()) {
      console.log('❌ Scheduled time must be in the future', scheduledDate)
      return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { xAccounts: { where: { isActive: true } } }
    })

    if (!user) {
      console.log('❌ User not found', clerkId)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.xAccounts.length === 0) {
      console.log('❌ No active X account found', clerkId)
      return NextResponse.json({ error: 'No active X account found' }, { status: 400 })
    }

    const xAccount = user.xAccounts[0]

    // Create scheduled content record
    const scheduledContent = await prisma.scheduledContent.create({
      data: {
        userId: user.id,
        xAccountId: xAccount.id,
        type: tweets.length > 1 ? 'thread' : 'tweet',
        content: JSON.stringify(tweets),
        previewText: tweets[0].content.substring(0, 100) + (tweets[0].content.length > 100 ? '...' : ''),
        scheduledFor: scheduledDate,
        status: 'scheduled',
        tweetCount: tweets.length,
        images: JSON.stringify(tweets.flatMap(t => t.images || []))
      }
    })

    // Create individual reply queue entries for each tweet
    const scheduledTweets = []
    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i]
      const tweetScheduledTime = new Date(scheduledDate.getTime() + (i * 2 * 60 * 1000)) // 2 minutes apart
      
      const queueEntry = await prisma.replyQueue.create({
        data: {
          userId: user.id,
          xAccountId: xAccount.id,
          tweetId: `scheduled_${scheduledContent.id}_${i}`,
          replyContent: tweet.content,
          replyType: 'scheduled_tweet',
          scheduledFor: tweetScheduledTime,
          status: 'pending',
          retryCount: 0
        }
      })
      
      scheduledTweets.push(queueEntry)
    }

    return NextResponse.json({ 
      success: true,
      scheduledContent: {
        id: scheduledContent.id,
        type: scheduledContent.type,
        previewText: scheduledContent.previewText,
        scheduledFor: scheduledContent.scheduledFor,
        tweetCount: scheduledContent.tweetCount,
        status: scheduledContent.status
      },
      scheduledTweets: scheduledTweets.map(t => ({
        id: t.id,
        scheduledFor: t.scheduledFor,
        content: t.replyContent
      }))
    })

  } catch (error) {
    console.error('Error scheduling tweets:', error)
    return NextResponse.json(
      { error: 'Failed to schedule tweets' },
      { status: 500 }
    )
  }
}