import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId, error } = await apiAuth(request)

    if (!clerkId) {
      console.log('❌ Auth failed in GET /api/replies/queue:', error)
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Build where clause
    const whereClause: any = {
      userId: user.id,
    }

    if (status && ['pending', 'sent', 'failed', 'cancelled'].includes(status)) {
      whereClause.status = status
    }

    const [replies, total] = await Promise.all([
      prisma.replyQueue.findMany({
        where: whereClause,
        include: {
          tweet: {
            include: {
              targetUser: {
                select: {
                  targetUsername: true,
                },
              },
            },
          },
          xAccount: {
            select: {
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.replyQueue.count({
        where: whereClause,
      }),
    ])

    // Get status counts
    const statusCounts = await prisma.replyQueue.groupBy({
      by: ['status'],
      where: { userId: user.id },
      _count: { status: true },
    })

    const counts = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      replies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      statusCounts: counts,
    })
  } catch (error) {
    console.error('Error fetching reply queue:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId, error } = await apiAuth(request)

    if (!clerkId) {
      console.log('❌ Auth failed in POST /api/replies/queue:', error)
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        xAccounts: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.xAccounts.length === 0) {
      return NextResponse.json({ error: 'No X account connected' }, { status: 400 })
    }

    const body = await request.json()
    const { tweetId, replyContent, scheduledFor } = body

    if (!tweetId || !replyContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the tweet to verify it exists and belongs to user
    const tweet = await prisma.tweet.findFirst({
      where: {
        id: tweetId,
        targetUser: {
          userId: user.id
        }
      },
      include: {
        targetUser: true
      }
    })

    if (!tweet) {
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 })
    }

    // Create reply queue entry
    const queuedReply = await prisma.replyQueue.create({
      data: {
        userId: user.id,
        xAccountId: user.xAccounts[0].id,
        tweetId: tweet.id,
        replyContent,
        replyType: 'ai_generated',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(Date.now() + 5 * 60 * 1000),
        status: 'pending',
      },
      include: {
        tweet: {
          include: {
            targetUser: {
              select: {
                targetUsername: true,
              },
            },
          },
        },
        xAccount: {
          select: {
            username: true,
          },
        },
      },
    })

    return NextResponse.json({
      reply: queuedReply,
      message: 'Reply scheduled successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error scheduling reply:', error)
    return NextResponse.json(
      { error: 'Failed to schedule reply' },
      { status: 500 }
    )
  }
}