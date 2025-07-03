import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Update autopilot settings to be active 24/7 for testing
    await prisma.autopilotSettings.upsert({
      where: { userId },
      update: {
        isEnabled: true,
        enabledHours: "00:00-23:59", // Active all day
        enabledDays: "[0,1,2,3,4,5,6]", // All days of week
        maxTweetAge: 10080, // 7 days instead of 24 hours
        maxRepliesPerDay: 50,
        maxRepliesPerHour: 10
      },
      create: {
        userId,
        isEnabled: true,
        enabledHours: "00:00-23:59",
        enabledDays: "[0,1,2,3,4,5,6]",
        maxTweetAge: 10080,
        maxRepliesPerDay: 50,
        maxRepliesPerHour: 10,
        minDelayBetweenReplies: 60, // 1 minute for testing
        minDelayToSameUser: 300, // 5 minutes for testing
        targetSentimentFilter: "all",
        onlyReplyToVerified: false,
        skipRetweets: true,
        skipReplies: true,
        minFollowerCount: 0,
        pauseIfBlocked: true,
        pauseIfRateLimited: true,
        notifyOnPause: true,
        customFilters: "{}"
      }
    })

    // Get user's target users and recent tweets
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        autopilotSettings: true,
        targetUsers: {
          include: {
            tweets: {
              orderBy: { publishedAt: 'desc' },
              take: 5
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Autopilot settings updated for testing',
      user: {
        id: user?.id,
        email: user?.email,
        autopilotSettings: user?.autopilotSettings,
        targetUsers: user?.targetUsers.map(target => ({
          username: target.targetUsername,
          recentTweets: target.tweets.length,
          lastScraped: target.lastScraped
        }))
      }
    })

  } catch (error) {
    console.error('Error updating autopilot for testing:', error)
    return NextResponse.json(
      { error: 'Failed to update autopilot' },
      { status: 500 }
    )
  }
}