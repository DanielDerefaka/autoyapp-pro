import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Default reply styles that users can customize
const DEFAULT_REPLY_STYLES = {
  tone: 'professional', // professional, casual, enthusiastic, thoughtful
  personality: 'supportive', // supportive, analytical, creative, direct
  length: 'medium', // short, medium, long
  engagement_level: 'medium', // low, medium, high
  topics_of_interest: ['technology', 'business', 'entrepreneurship'],
  avoid_topics: ['politics', 'controversial'],
  custom_instructions: '',
  examples: {
    positive_reply: "This is exciting! The progress you're making is really inspiring.",
    neutral_reply: "Great insights here. This really adds to the conversation.",
    negative_reply: "I understand the challenge. Have you considered approaching it from a different angle?"
  }
}

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

    // Try to get user's custom reply styles (handle table not existing)
    try {
      const replyStyles = await prisma.replyStyle.findUnique({
        where: { userId: user.id }
      })

      if (replyStyles) {
        return NextResponse.json({
          styles: JSON.parse(replyStyles.styles),
          updatedAt: replyStyles.updatedAt
        })
      }
    } catch (error: any) {
      // If table doesn't exist, just return defaults
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        console.log('ReplyStyle table does not exist yet, returning defaults')
        return NextResponse.json({
          styles: DEFAULT_REPLY_STYLES,
          isDefault: true,
          tableNotExists: true
        })
      }
      throw error
    }

    // Return default styles if none exist
    return NextResponse.json({
      styles: DEFAULT_REPLY_STYLES,
      isDefault: true
    })

  } catch (error) {
    console.error('Error fetching reply styles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reply styles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { styles } = body

    if (!styles) {
      return NextResponse.json({ error: 'Styles configuration required' }, { status: 400 })
    }

    // Validate and sanitize styles
    const validatedStyles = {
      ...DEFAULT_REPLY_STYLES,
      ...styles,
      // Ensure required fields exist
      tone: styles.tone || 'professional',
      personality: styles.personality || 'supportive',
      length: styles.length || 'medium',
      engagement_level: styles.engagement_level || 'medium'
    }

    // Save or update user's reply styles (handle table not existing)
    try {
      await prisma.replyStyle.upsert({
        where: { userId: user.id },
        update: {
          styles: JSON.stringify(validatedStyles),
          updatedAt: new Date()
        },
        create: {
          userId: user.id,
          styles: JSON.stringify(validatedStyles)
        }
      })
    } catch (error: any) {
      // If table doesn't exist, return error with helpful message
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        return NextResponse.json({
          error: 'Reply styles table not created yet. Database migration needed.',
          needsMigration: true
        }, { status: 503 })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      styles: validatedStyles,
      message: 'Reply styles updated successfully'
    })

  } catch (error) {
    console.error('Error updating reply styles:', error)
    return NextResponse.json(
      { error: 'Failed to update reply styles' },
      { status: 500 }
    )
  }
}