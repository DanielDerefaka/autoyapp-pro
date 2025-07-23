import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Test endpoint to create sample scheduled content for testing scheduler
 */
export async function POST(request: NextRequest) {
  try {
    // Create test user first if doesn't exist
    let testUser = await prisma.user.findFirst({
      where: { email: 'test@scheduler.com' }
    })

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          clerkId: 'test_clerk_id_scheduler',
          email: 'test@scheduler.com',
          name: 'Scheduler Test User',
          subscriptionTier: 'pro'
        }
      })
    }

    // Create test X account if doesn't exist
    let testXAccount = await prisma.xAccount.findFirst({
      where: { userId: testUser.id }
    })

    if (!testXAccount) {
      testXAccount = await prisma.xAccount.create({
        data: {
          userId: testUser.id,
          xUserId: 'test_x_user_id_scheduler',
          username: 'testscheduler',
          accessToken: Buffer.from('test_access_token_123').toString('base64'), // Fake token for testing
          isActive: true
        }
      })
    }

    // Create scheduled content for testing
    const now = new Date()
    const testContent = [
      {
        type: 'tweet',
        content: JSON.stringify([
          { content: 'Test scheduled tweet #1 - This should be published immediately!' }
        ]),
        previewText: 'Test scheduled tweet #1 - This should be published immediately!',
        scheduledFor: new Date(now.getTime() - 60000), // 1 minute ago (should process immediately)
        status: 'scheduled',
        tweetCount: 1,
        images: '[]'
      },
      {
        type: 'tweet',
        content: JSON.stringify([
          { content: 'Test scheduled tweet #2 - This should publish in 2 minutes' }
        ]),
        previewText: 'Test scheduled tweet #2 - This should publish in 2 minutes',
        scheduledFor: new Date(now.getTime() + 120000), // 2 minutes from now
        status: 'scheduled',
        tweetCount: 1,
        images: '[]'
      },
      {
        type: 'thread',
        content: JSON.stringify([
          { content: 'Test thread tweet 1/2' },
          { content: 'Test thread tweet 2/2 - Complete thread!' }
        ]),
        previewText: 'Test thread tweet 1/2',
        scheduledFor: new Date(now.getTime() + 30000), // 30 seconds from now
        status: 'scheduled',
        tweetCount: 2,
        images: '[]'
      }
    ]

    const createdContent = await Promise.all(
      testContent.map(content => 
        prisma.scheduledContent.create({
          data: {
            userId: testUser.id,
            xAccountId: testXAccount.id,
            ...content
          }
        })
      )
    )

    // Also create some test reply queue items
    const testReplies = [
      {
        tweetId: 'test_tweet_123',
        replyContent: 'Great point! This is an automated test reply.',
        scheduledFor: new Date(now.getTime() - 30000), // 30 seconds ago
        status: 'pending'
      },
      {
        tweetId: 'test_tweet_456',
        replyContent: 'I completely agree with this perspective!',
        scheduledFor: new Date(now.getTime() + 45000), // 45 seconds from now
        status: 'pending'
      }
    ]

    // First create a test target user
    let testTarget = await prisma.targetUser.findFirst({
      where: { 
        userId: testUser.id,
        targetUsername: 'testtarget'
      }
    })

    if (!testTarget) {
      testTarget = await prisma.targetUser.create({
        data: {
          userId: testUser.id,
          xAccountId: testXAccount.id,
          targetUsername: 'testtarget',
          targetUserId: 'test_target_user_123',
          isActive: true,
          engagementScore: 85
        }
      })
    }

    // Create a test tweet to reply to
    let testTweet = await prisma.tweet.findFirst({
      where: { tweetId: 'test_tweet_123' }
    })

    if (!testTweet) {
      testTweet = await prisma.tweet.create({
        data: {
          tweetId: 'test_tweet_123',
          targetUserId: testTarget.id,
          content: 'This is a test tweet for scheduler testing.',
          authorUsername: 'testtarget',
          publishedAt: new Date(),
          likeCount: 10,
          replyCount: 5,
          retweetCount: 2
        }
      })
    }

    const createdReplies = await Promise.all(
      testReplies.map(reply => 
        prisma.replyQueue.create({
          data: {
            userId: testUser.id,
            xAccountId: testXAccount.id,
            tweetId: testTweet.id, // Use the tweet's database ID, not the X tweet ID
            replyContent: reply.replyContent,
            scheduledFor: reply.scheduledFor,
            status: reply.status
          }
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: 'Test scheduled content created successfully',
      data: {
        user: { id: testUser.id, email: testUser.email },
        xAccount: { id: testXAccount.id, username: testXAccount.username },
        scheduledContent: createdContent.map(c => ({
          id: c.id,
          scheduledFor: c.scheduledFor,
          status: c.status,
          contentPreview: JSON.parse(c.content)[0].content.substring(0, 50) + '...'
        })),
        replyQueue: createdReplies.map(r => ({
          id: r.id,
          scheduledFor: r.scheduledFor,
          status: r.status,
          tweetId: r.tweetId,
          replyPreview: r.replyContent.substring(0, 50) + '...'
        })),
        testInstructions: {
          1: 'Run GET /api/test/scheduler?action=trigger-all to process items',
          2: 'Check scheduler status at GET /api/test/scheduler?action=status',
          3: 'Items scheduled in the past should process immediately',
          4: 'Items scheduled in the future will wait until their time'
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error creating test scheduled content:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create test scheduled content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to show current test data
 */
export async function GET(request: NextRequest) {
  try {
    const testUser = await prisma.user.findFirst({
      where: { email: 'test@scheduler.com' },
      include: {
        scheduledContent: {
          orderBy: { scheduledFor: 'asc' }
        },
        replyQueue: {
          include: {
            tweet: true
          },
          orderBy: { scheduledFor: 'asc' }
        }
      }
    })

    if (!testUser) {
      return NextResponse.json({
        success: false,
        message: 'No test data found. Run POST /api/test/create-scheduled-content to create test data.'
      })
    }

    const now = new Date()
    
    return NextResponse.json({
      success: true,
      data: {
        user: { id: testUser.id, email: testUser.email },
        scheduledContent: testUser.scheduledContent.map(c => ({
          id: c.id,
          scheduledFor: c.scheduledFor,
          status: c.status,
          shouldProcess: c.scheduledFor <= now && c.status === 'scheduled',
          contentPreview: JSON.parse(c.content)[0].content.substring(0, 80) + '...',
          minutesUntilScheduled: Math.round((c.scheduledFor.getTime() - now.getTime()) / 60000)
        })),
        replyQueue: testUser.replyQueue.map(r => ({
          id: r.id,
          scheduledFor: r.scheduledFor,
          status: r.status,
          shouldProcess: r.scheduledFor <= now && r.status === 'pending',
          replyPreview: r.replyContent.substring(0, 80) + '...',
          minutesUntilScheduled: Math.round((r.scheduledFor.getTime() - now.getTime()) / 60000)
        })),
        summary: {
          totalScheduledContent: testUser.scheduledContent.length,
          contentReadyToProcess: testUser.scheduledContent.filter(c => c.scheduledFor <= now && c.status === 'scheduled').length,
          totalReplyQueue: testUser.replyQueue.length,
          repliesReadyToProcess: testUser.replyQueue.filter(r => r.scheduledFor <= now && r.status === 'pending').length
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching test data:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch test data'
      },
      { status: 500 }
    )
  }
}