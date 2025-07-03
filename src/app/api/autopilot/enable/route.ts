import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { autopilotSettings: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create or update autopilot settings
    const autopilotSettings = await prisma.autopilotSettings.upsert({
      where: { userId },
      update: { isEnabled: true },
      create: {
        userId,
        isEnabled: true,
        maxRepliesPerDay: 30,
        maxRepliesPerHour: 5,
        minDelayBetweenReplies: 360, // 6 minutes
        minDelayToSameUser: 1800, // 30 minutes
        enabledHours: "09:00-17:00",
        enabledDays: "[1,2,3,4,5]", // Monday to Friday
        targetSentimentFilter: "all",
        onlyReplyToVerified: false,
        skipRetweets: true,
        skipReplies: true,
        minFollowerCount: 0,
        maxTweetAge: 1440, // 24 hours
        pauseIfBlocked: true,
        pauseIfRateLimited: true,
        notifyOnPause: true,
        customFilters: "{}"
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Autopilot enabled',
      settings: autopilotSettings
    })

  } catch (error) {
    console.error('Error enabling autopilot:', error)
    return NextResponse.json(
      { error: 'Failed to enable autopilot' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get all users with autopilot settings
    const users = await prisma.user.findMany({
      include: {
        autopilotSettings: true,
        targetUsers: {
          where: { isActive: true }
        }
      }
    })

    return NextResponse.json({
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        autopilotEnabled: user.autopilotSettings?.isEnabled || false,
        targetUsersCount: user.targetUsers.length
      }))
    })

  } catch (error) {
    console.error('Error fetching autopilot users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}