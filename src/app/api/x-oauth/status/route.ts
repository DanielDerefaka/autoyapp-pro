import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId, error } = await apiAuth(request)
    console.log('🔍 X OAuth Status - Clerk ID:', clerkId)

    if (!clerkId) {
      console.log('❌ Auth failed in GET /api/x-oauth/status:', error)
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        xAccounts: {
          select: {
            id: true,
            username: true,
            xUserId: true,
            lastActivity: true,
            isActive: true,
          },
        },
      },
    })

    console.log('🔍 Found user:', user ? `${user.email} (${user.id})` : 'null')
    console.log('🔍 User X accounts:', user?.xAccounts?.length || 0)

    if (!user) {
      // Try to find all users to see what's in the database
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, clerkId: true }
      })
      console.log('🔍 All users in database:', allUsers)
      
      return NextResponse.json({ 
        error: 'User not found',
        debug: {
          searchedClerkId: clerkId,
          allUsers: allUsers
        }
      }, { status: 404 })
    }

    const xAccount = user.xAccounts.find(x => x.isActive) || null
    console.log('🔍 Active X account:', xAccount ? `@${xAccount.username}` : 'none')

    return NextResponse.json({
      xAccount,
      isConnected: !!xAccount,
      debug: {
        userId: user.id,
        clerkId: user.clerkId,
        totalXAccounts: user.xAccounts.length,
        activeXAccounts: user.xAccounts.filter(x => x.isActive).length
      }
    })
  } catch (error) {
    console.error('Error fetching X OAuth status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OAuth status' },
      { status: 500 }
    )
  }
}