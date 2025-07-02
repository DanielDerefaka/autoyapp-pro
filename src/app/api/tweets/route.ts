import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const targetUserId = searchParams.get('targetUserId')
    const sentiment = searchParams.get('sentiment')
    const sortBy = searchParams.get('sortBy') || 'recent'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('🔍 Tweets API called with params:')
    console.log('  - User ID:', user.id)
    console.log('  - Target User ID:', targetUserId)
    console.log('  - Sentiment:', sentiment)
    console.log('  - Sort By:', sortBy)
    console.log('  - Limit:', limit)

    // Build where clause
    const whereClause: any = {
      targetUser: {
        userId: user.id,
      },
      isDeleted: false,
    }

    if (targetUserId) {
      whereClause.targetUserId = targetUserId
    }

    if (sentiment) {
      if (sentiment === 'positive') {
        whereClause.sentimentScore = { gt: 0.1 }
      } else if (sentiment === 'negative') {
        whereClause.sentimentScore = { lt: -0.1 }
      } else if (sentiment === 'neutral') {
        whereClause.sentimentScore = { gte: -0.1, lte: 0.1 }
      }
    }

    // Build order by clause
    let orderBy: any = {}
    switch (sortBy) {
      case 'popular':
        orderBy = { likeCount: 'desc' }
        break
      case 'engagement':
        orderBy = [
          { likeCount: 'desc' },
          { retweetCount: 'desc' },
          { replyCount: 'desc' }
        ]
        break
      case 'recent':
      default:
        orderBy = { publishedAt: 'desc' }
        break
    }

    console.log('🔍 Where clause:', JSON.stringify(whereClause, null, 2))

    const [tweets, total] = await Promise.all([
      prisma.tweet.findMany({
        where: whereClause,
        include: {
          targetUser: {
            select: {
              id: true,
              targetUsername: true,
              engagementScore: true,
            },
          },
          replies: {
            select: {
              id: true,
              status: true,
              replyContent: true,
              scheduledFor: true,
              sentAt: true,
            },
          },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.tweet.count({
        where: whereClause,
      }),
    ])

    console.log('🔍 Query results:')
    console.log('  - Total tweets found:', total)
    console.log('  - Tweets returned:', tweets.length)
    if (tweets.length > 0) {
      console.log('  - Target users in results:', [...new Set(tweets.map(t => t.targetUser.targetUsername))])
    }

    return NextResponse.json({
      tweets,
      totalCount: total,
      hasMore: total > offset + limit
    })
  } catch (error) {
    console.error('Error fetching tweets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}