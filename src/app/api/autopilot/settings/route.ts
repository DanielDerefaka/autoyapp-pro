import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Default autopilot settings based on X ToS compliance
const DEFAULT_AUTOPILOT_SETTINGS = {
  isEnabled: false,
  maxRepliesPerDay: 30,           // Conservative limit to avoid suspension
  maxRepliesPerHour: 5,           // Spread throughout day
  minDelayBetweenReplies: 360,    // 6 minutes minimum between any replies
  minDelayToSameUser: 1800,       // 30 minutes before replying to same user again
  enabledHours: "09:00-17:00",    // Business hours only by default
  enabledDays: "[1,2,3,4,5]",     // Weekdays only (Monday=1, Sunday=7)
  targetSentimentFilter: "all",   // Reply to all sentiment types
  onlyReplyToVerified: false,     // Reply to all users
  skipRetweets: true,             // Skip retweets for original content
  skipReplies: true,              // Skip replies for original content
  minFollowerCount: 0,            // No minimum follower requirement
  maxTweetAge: 1440,              // Only reply to tweets within 24 hours
  pauseIfBlocked: true,           // Auto-pause if blocked
  pauseIfRateLimited: true,       // Auto-pause if rate limited
  notifyOnPause: true,            // Send email when paused
  customFilters: "{}"             // No custom filters by default
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await auth()
    const clerkId = authResult?.userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Try to get user's autopilot settings (handle table not existing)
    try {
      const autopilotSettings = await prisma.autopilotSettings.findUnique({
        where: { userId: user.id }
      })

      if (autopilotSettings) {
        return NextResponse.json({
          settings: {
            ...autopilotSettings,
            enabledHours: autopilotSettings.enabledHours,
            enabledDays: JSON.parse(autopilotSettings.enabledDays),
            customFilters: JSON.parse(autopilotSettings.customFilters)
          },
          updatedAt: autopilotSettings.updatedAt
        })
      }
    } catch (error: any) {
      // If table doesn't exist, return defaults
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        console.log('AutopilotSettings table does not exist yet, returning defaults')
        return NextResponse.json({
          settings: {
            ...DEFAULT_AUTOPILOT_SETTINGS,
            enabledDays: JSON.parse(DEFAULT_AUTOPILOT_SETTINGS.enabledDays),
            customFilters: JSON.parse(DEFAULT_AUTOPILOT_SETTINGS.customFilters)
          },
          isDefault: true,
          tableNotExists: true
        })
      }
      throw error
    }

    // Return default settings if none exist
    return NextResponse.json({
      settings: {
        ...DEFAULT_AUTOPILOT_SETTINGS,
        enabledDays: JSON.parse(DEFAULT_AUTOPILOT_SETTINGS.enabledDays),
        customFilters: JSON.parse(DEFAULT_AUTOPILOT_SETTINGS.customFilters)
      },
      isDefault: true
    })

  } catch (error) {
    console.error('Error fetching autopilot settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch autopilot settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  // PUT and POST do the same thing - update/create settings
  return POST(request)
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await auth()
    const clerkId = authResult?.userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    console.log('Autopilot settings request body:', body)
    
    // Handle both formats: { settings: {...} } and direct { isEnabled: true, ... }
    const settings = body.settings || body
    
    if (!settings || typeof settings !== 'object') {
      console.log('No valid settings found in request body')
      return NextResponse.json({ error: 'Settings configuration required' }, { status: 400 })
    }

    console.log('Settings data:', settings)

    // Validate and sanitize settings with compliance checks
    const validatedSettings = {
      ...DEFAULT_AUTOPILOT_SETTINGS,
      ...settings,
      // Enforce minimum compliance limits
      maxRepliesPerDay: Math.min(Math.max(settings.maxRepliesPerDay || 30, 1), 50), // Max 50/day
      maxRepliesPerHour: Math.min(Math.max(settings.maxRepliesPerHour || 5, 1), 10), // Max 10/hour
      minDelayBetweenReplies: Math.max(settings.minDelayBetweenReplies || 360, 300), // Min 5 minutes
      minDelayToSameUser: Math.max(settings.minDelayToSameUser || 1800, 600), // Min 10 minutes
      maxTweetAge: Math.min(Math.max(settings.maxTweetAge || 1440, 60), 4320), // Max 3 days
      // Convert arrays to strings for storage
      enabledDays: JSON.stringify(settings.enabledDays || [1,2,3,4,5]),
      customFilters: JSON.stringify(settings.customFilters || {})
    }

    // Save or update user's autopilot settings (handle table not existing)
    try {
      const savedSettings = await prisma.autopilotSettings.upsert({
        where: { userId: user.id },
        update: {
          ...validatedSettings,
          updatedAt: new Date()
        },
        create: {
          userId: user.id,
          ...validatedSettings
        }
      })

      return NextResponse.json({
        success: true,
        settings: {
          ...savedSettings,
          enabledDays: JSON.parse(savedSettings.enabledDays),
          customFilters: JSON.parse(savedSettings.customFilters)
        },
        message: 'Autopilot settings saved successfully'
      })
    } catch (error: any) {
      // If table doesn't exist, return error with helpful message
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        return NextResponse.json({
          error: 'Autopilot settings table not created yet. Database migration needed.',
          needsMigration: true
        }, { status: 503 })
      }
      throw error
    }

  } catch (error) {
    console.error('Error updating autopilot settings:', error)
    return NextResponse.json(
      { error: 'Failed to update autopilot settings' },
      { status: 500 }
    )
  }
}

// Emergency pause endpoint
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await auth()
    const clerkId = authResult?.userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Emergency pause: disable autopilot immediately
    try {
      await prisma.autopilotSettings.update({
        where: { userId: user.id },
        data: { 
          isEnabled: false,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Autopilot paused immediately'
      })
    } catch (error: any) {
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          message: 'Autopilot already disabled (no settings found)'
        })
      }
      throw error
    }

  } catch (error) {
    console.error('Error pausing autopilot:', error)
    return NextResponse.json(
      { error: 'Failed to pause autopilot' },
      { status: 500 }
    )
  }
}