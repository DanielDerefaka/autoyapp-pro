import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { xApiClient } from '@/lib/x-api'
import { XTokenManager } from '@/lib/x-token-manager'

export async function POST(request: NextRequest) {
  try {
    const authResult = await auth()
    const clerkId = authResult?.userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type')
    let tweets: any[]

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData with images
      const formData = await request.formData()
      const tweetsData = formData.get('tweets') as string
      tweets = JSON.parse(tweetsData)
      
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
    }

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

    // Publish tweets with automatic token refresh handling
    const publishedTweets = []
    let lastTweetId: string | undefined = undefined
    let publishedContent: any = null
    
    try {
      for (let i = 0; i < tweets.length; i++) {
        const tweet = tweets[i]
        
        console.log(`📤 Publishing tweet ${i + 1}/${tweets.length} to X for @${xAccount.username}...`)
        
        // Use token manager to handle all X API operations
        const publishedTweet = await XTokenManager.withTokenRefresh(
          xAccount.id,
          async (accessToken: string) => {
            // Handle media uploads if present
            let mediaIds: string[] = []
            if (tweet.images && tweet.images.length > 0) {
              console.log(`📸 Uploading ${tweet.images.length} images for tweet ${i + 1}...`)
              
              for (const [imageIndex, image] of tweet.images.entries()) {
                try {
                  let buffer: Buffer
                  let mimeType: string
                  
                  console.log(`🖼️ Processing image ${imageIndex + 1}:`, {
                    isFile: image instanceof File,
                    type: image.type || 'unknown',
                    size: image.size || 'unknown'
                  })
                  
                  if (image instanceof File) {
                    // Convert File to Buffer
                    const arrayBuffer = await image.arrayBuffer()
                    buffer = Buffer.from(arrayBuffer)
                    mimeType = image.type
                    
                    console.log(`✅ Converted File to Buffer: ${buffer.length} bytes, type: ${mimeType}`)
                  } else if (typeof image === 'string') {
                    // Handle base64 encoded images (fallback)
                    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
                    buffer = Buffer.from(base64Data, 'base64')
                    mimeType = 'image/jpeg' // Default fallback
                    
                    console.log(`✅ Converted base64 to Buffer: ${buffer.length} bytes`)
                  } else {
                    console.error(`❌ Unknown image format:`, typeof image)
                    continue
                  }
                  
                  // Validate image size (X has limits)
                  if (buffer.length > 5 * 1024 * 1024) { // 5MB limit
                    console.error(`❌ Image too large: ${buffer.length} bytes (max 5MB)`)
                    continue
                  }
                  
                  // Upload media to X
                  console.log(`🔄 Uploading to X API...`)
                  const mediaResponse = await xApiClient.uploadMedia(
                    buffer,
                    mimeType,
                    accessToken // Use fresh token from token manager
                  )
                  
                  mediaIds.push(mediaResponse.media_id_string)
                  console.log(`✅ Successfully uploaded media: ${mediaResponse.media_id_string}`)
                } catch (uploadError) {
                  console.error(`❌ Failed to upload image ${imageIndex + 1}:`, {
                    error: uploadError instanceof Error ? uploadError.message : uploadError,
                    stack: uploadError instanceof Error ? uploadError.stack : undefined
                  })
                  // Continue without this image rather than failing the entire tweet
                }
              }
              
              console.log(`📊 Media upload summary: ${mediaIds.length}/${tweet.images.length} images uploaded successfully`)
            }
            
            // Post to X API
            const response = await xApiClient.postTweet(tweet.content, {
              replyToTweetId: lastTweetId, // For threads, reply to previous tweet
              accessToken: accessToken, // Use fresh token from token manager
              mediaIds: mediaIds.length > 0 ? mediaIds : undefined
            })
            
            return {
              id: response.data.id,
              tweetId: response.data.id,
              content: response.data.text,
              publishedAt: new Date(),
              mediaCount: mediaIds.length
            }
          }
        )
        
        publishedTweets.push(publishedTweet)
        lastTweetId = publishedTweet.id // For threading
        
        console.log(`✅ Published tweet ${i + 1}: ${publishedTweet.id} ${publishedTweet.mediaCount > 0 ? `with ${publishedTweet.mediaCount} images` : ''}`)
        
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