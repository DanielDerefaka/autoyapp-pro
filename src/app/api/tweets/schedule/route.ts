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

    const contentType = request.headers.get('content-type')
    let tweets: any[]
    let scheduledFor: string

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData with images
      const formData = await request.formData()
      const tweetsData = formData.get('tweets') as string
      tweets = JSON.parse(tweetsData)
      scheduledFor = formData.get('scheduledFor') as string
      
      // Process images for each tweet
      for (let i = 0; i < tweets.length; i++) {
        const tweetImages = []
        let imageIndex = 0
        
        while (true) {
          const imageFile = formData.get(`tweet_${i}_image_${imageIndex}`) as File
          if (!imageFile) break
          
          tweetImages.push(imageFile)
          imageIndex++
        }
        
        tweets[i].images = tweetImages
      }
    } else {
      // Handle regular JSON (backward compatibility)
      const body = await request.json()
      tweets = body.tweets
      scheduledFor = body.scheduledFor
    }

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
        content: JSON.stringify(tweets.map((tweet, index) => ({
          ...tweet,
          scheduledFor: new Date(scheduledDate.getTime() + (index * 2 * 60 * 1000)).toISOString()
        }))),
        previewText: tweets[0].content.substring(0, 100) + (tweets[0].content.length > 100 ? '...' : ''),
        scheduledFor: scheduledDate,
        status: 'scheduled',
        tweetCount: tweets.length,
        images: JSON.stringify(tweets.flatMap(t => t.images || []))
      }
    })

    // For scheduled tweets, we don't create ReplyQueue entries since there are no actual tweets yet
    // The scheduled content will be processed by a cron job that will publish the tweets
    console.log(`✅ Scheduled content created with ID: ${scheduledContent.id}`)
    
    // Create a simple response with scheduling details
    const scheduledTweets = tweets.map((tweet, index) => ({
      id: `scheduled_${scheduledContent.id}_${index}`,
      scheduledFor: new Date(scheduledDate.getTime() + (index * 2 * 60 * 1000)),
      content: tweet.content,
      order: index + 1
    }))

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