import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { ViralStylesManager } from '@/lib/viral-styles'

export async function GET() {
  try {
    const personalities = ViralStylesManager.VIRAL_PERSONALITIES.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      viralScore: p.viralScore,
      bestFor: p.bestFor,
      examples: p.examples.slice(0, 2)
    }))

    return NextResponse.json({
      styles: {
        tone: 'professional',
        personality: 'supportive',
        length: 'medium',
        engagement_level: 'medium',
        topics_of_interest: ['technology', 'business', 'entrepreneurship'],
        avoid_topics: ['politics', 'controversial'],
        custom_instructions: '',
        examples: {
          positive_reply: "This is exciting! The progress you're making is really inspiring.",
          neutral_reply: "Great insights here. This really adds to the conversation.",
          negative_reply: "I understand the challenge. Have you considered approaching it from a different angle?"
        }
      },
      availablePersonalities: personalities,
      availableStrategies: ViralStylesManager.VIRAL_STRATEGIES.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        effectiveness: s.effectiveness,
        useCases: s.useCases
      })),
      tableNotExists: false
    })
  } catch (error) {
    console.error('Error getting reply styles:', error)
    return NextResponse.json({ error: 'Failed to get reply styles' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    const clerkId = userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { styles } = await request.json()
    
    if (!styles) {
      return NextResponse.json({ error: 'Styles data is required' }, { status: 400 })
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { clerkId }
    })

    if (!user) {
      // Get user details from Clerk
      const clerkUser = await currentUser()
      
      if (!clerkUser || !clerkUser.emailAddresses?.[0]?.emailAddress) {
        return NextResponse.json({ error: 'Unable to get user details' }, { status: 400 })
      }

      user = await prisma.user.create({
        data: { 
          clerkId,
          email: clerkUser.emailAddresses[0].emailAddress,
          name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : null
        }
      })
    }

    // Save or update reply styles
    const savedStyles = await prisma.replyStyle.upsert({
      where: { userId: user.id },
      update: {
        styles: JSON.stringify(styles),
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        styles: JSON.stringify(styles)
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Reply styles saved successfully',
      styles,
      savedAt: savedStyles.updatedAt
    })
  } catch (error) {
    console.error('Error saving reply styles:', error)
    
    // Handle specific database errors
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Reply styles already exist for this user' }, { status: 409 })
    }
    
    return NextResponse.json({ error: 'Failed to save reply styles' }, { status: 500 })
  }
}