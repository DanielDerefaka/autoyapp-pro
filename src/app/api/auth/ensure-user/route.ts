import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const { userId: clerkId } = await auth()
    const clerkUser = await currentUser()

    if (!clerkId || !clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Ensuring user exists for Clerk ID:', clerkId)
    console.log('🔍 Clerk user email:', clerkUser.emailAddresses[0]?.emailAddress)

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { clerkId },
      include: { xAccounts: true }
    })

    if (!user) {
      console.log('🔍 User not found, creating new user...')
      
      // Create new user
      user = await prisma.user.create({
        data: {
          clerkId,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
          subscriptionTier: 'free',
        },
        include: { xAccounts: true }
      })
      
      console.log('✅ Created new user:', user.id)
    } else {
      console.log('✅ User already exists:', user.id)
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        clerkId: user.clerkId,
        subscriptionTier: user.subscriptionTier,
        hasXAccount: user.xAccounts.length > 0,
      }
    })
  } catch (error) {
    console.error('Error ensuring user exists:', error)
    return NextResponse.json(
      { error: 'Failed to ensure user exists' },
      { status: 500 }
    )
  }
}