import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    // Try mobile auth first, then fall back to web auth
    let clerkId: string | null = null
    let clerkUser: any = null
    
    const mobileAuth = await apiAuth(request)
    if (mobileAuth.userId) {
      clerkId = mobileAuth.userId
      // For mobile, we'll need to get user info from Clerk API using the user ID
      try {
        const { clerkClient } = await import('@clerk/nextjs/server')
        clerkUser = await clerkClient().users.getUser(clerkId)
        console.log('🔐 Using mobile auth for user creation')
      } catch (error) {
        console.error('Failed to get mobile user from Clerk:', error)
      }
    } else {
      // Fall back to web auth
      const webAuth = await auth()
      clerkId = webAuth.userId
      clerkUser = await currentUser()
      console.log('🔐 Using web auth for user creation')
    }

    if (!clerkId) {
      console.log('❌ No authentication found in ensure-user')
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
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress || 
                   clerkUser?.primaryEmailAddress?.emailAddress || ''
      const firstName = clerkUser?.firstName || ''
      const lastName = clerkUser?.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim() || null

      user = await prisma.user.create({
        data: {
          clerkId,
          email,
          name: fullName,
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