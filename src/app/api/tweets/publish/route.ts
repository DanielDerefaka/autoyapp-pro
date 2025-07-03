import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { xApiClient } from '@/lib/x-api'

export async function POST(request: NextRequest) {
  try {
    const authResult = await auth()
    const clerkId = authResult?.userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tweets } = await request.json()

    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return NextResponse.json({ error: 'Tweets array is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { xAccounts: { where: { isActive: true } } }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.xAccounts.length === 0) {
      return NextResponse.json({ 
        error: 'No X account connected', 
        message: 'Please connect your X (Twitter) account first to publish tweets',
        needsConnection: true 
      }, { status: 400 })
    }

    const xAccount = user.xAccounts[0] // Use the first active account
    
    // Check if we have a valid access token
    if (!xAccount.accessToken) {
      return NextResponse.json({ 
        error: 'Invalid X account connection', 
        message: 'Please reconnect your X (Twitter) account',
        needsReconnection: true 
      }, { status: 400 })
    }

    // Decrypt the access token (it's base64 encoded in storage)
    let userAccessToken: string
    try {
      userAccessToken = Buffer.from(xAccount.accessToken, 'base64').toString('utf-8')
      console.log('🔑 Decrypted access token:', userAccessToken.substring(0, 20) + '...')
      console.log('🔑 Token appears to be:', userAccessToken.startsWith('AAAA') ? 'Bearer Token (App-Only)' : 'User Access Token')
    } catch (decryptError) {
      console.error('❌ Failed to decrypt access token:', decryptError)
      return NextResponse.json({ 
        error: 'Invalid access token', 
        message: 'Please reconnect your X account',
        needsReconnection: true 
      }, { status: 400 })
    }

    // Actually publish to X (Twitter) using the API
    const publishedTweets = []
    let lastTweetId: string | undefined = undefined
    let publishedContent: any = null
    
    try {
      for (let i = 0; i < tweets.length; i++) {
        const tweet = tweets[i]
        
        console.log(`📤 Publishing tweet ${i + 1}/${tweets.length} to X...`)
        
        // Post to X API
        const response = await xApiClient.postTweet(tweet.content, {
          replyToTweetId: lastTweetId, // For threads, reply to previous tweet
          accessToken: userAccessToken // Use the decoded token
        })
        
        const publishedTweet = {
          id: response.data.id,
          tweetId: response.data.id,
          content: response.data.text,
          publishedAt: new Date()
        }
        
        publishedTweets.push(publishedTweet)
        lastTweetId = response.data.id // For threading
        
        console.log(`✅ Published tweet ${i + 1}: ${response.data.id}`)
        
        // Add delay between tweets in a thread (2 seconds)
        if (i < tweets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      
      // Create a record to track the published content
      publishedContent = await prisma.scheduledContent.create({
        data: {
          userId: user.id,
          xAccountId: xAccount.id,
          type: tweets.length > 1 ? 'thread' : 'tweet',
          content: JSON.stringify(tweets.map(t => ({ content: t.content, images: t.images || [] }))),
          previewText: tweets[0].content.substring(0, 100) + (tweets[0].content.length > 100 ? '...' : ''),
          scheduledFor: new Date(),
          status: 'published',
          tweetCount: tweets.length,
          images: JSON.stringify(tweets.flatMap(t => t.images || [])),
          publishedAt: new Date()
        }
      })
      
      console.log(`🎉 Successfully published ${tweets.length > 1 ? 'thread' : 'tweet'} with ${tweets.length} tweets`)
      
    } catch (publishError) {
      console.error('❌ Failed to publish to X:', publishError)
      
      // If publishing fails, create a failed record
      await prisma.scheduledContent.create({
        data: {
          userId: user.id,
          xAccountId: xAccount.id,
          type: tweets.length > 1 ? 'thread' : 'tweet',
          content: JSON.stringify(tweets.map(t => ({ content: t.content, images: t.images || [] }))),
          previewText: tweets[0].content.substring(0, 100) + (tweets[0].content.length > 100 ? '...' : ''),
          scheduledFor: new Date(),
          status: 'failed',
          tweetCount: tweets.length,
          images: JSON.stringify(tweets.flatMap(t => t.images || [])),
          errorMessage: publishError instanceof Error ? publishError.message : 'Unknown error'
        }
      })
      
      throw new Error(`Failed to publish to X: ${publishError instanceof Error ? publishError.message : 'Unknown error'}`)
    }

    // Log the publishing activity
    await prisma.engagementAnalytics.create({
      data: {
        userId: user.id,
        engagementType: 'tweet_published',
        engagementValue: tweets.length,
        trackedAt: new Date()
      }
    })

    return NextResponse.json({ 
      success: true,
      publishedContent: publishedContent ? {
        id: publishedContent.id,
        type: publishedContent.type,
        status: publishedContent.status,
        publishedAt: publishedContent.publishedAt
      } : null,
      publishedTweets
    })

  } catch (error) {
    console.error('Error publishing tweets:', error)
    return NextResponse.json(
      { error: 'Failed to publish tweets' },
      { status: 500 }
    )
  }
}