import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const notificationPreferencesSchema = z.object({
  dailyDigest: z.boolean(),
  complianceAlerts: z.boolean(),
  successNotifications: z.boolean(),
  errorAlerts: z.boolean(),
  weeklyReports: z.boolean(),
})

// Get notification preferences
export async function GET() {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      select: {
        id: true,
        email: true,
        name: true,
        notificationPreferences: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Default preferences if none exist
    const defaultPreferences = {
      dailyDigest: true,
      complianceAlerts: true,
      successNotifications: true,
      errorAlerts: true,
      weeklyReports: true,
    }

    const preferences = user.notificationPreferences || defaultPreferences

    return NextResponse.json({
      user: {
        email: user.email,
        name: user.name,
      },
      preferences,
    })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const preferences = notificationPreferencesSchema.parse(body)

    const updatedUser = await prisma.user.update({
      where: { clerkId: clerkId },
      data: {
        notificationPreferences: preferences,
      },
      select: {
        id: true,
        email: true,
        name: true,
        notificationPreferences: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        email: updatedUser.email,
        name: updatedUser.name,
      },
      preferences: updatedUser.notificationPreferences,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}