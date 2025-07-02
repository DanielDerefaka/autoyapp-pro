import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user first
    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found', clerkId }, { status: 404 })
    }

    // Get all X accounts for this user
    const xAccounts = await prisma.xAccount.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        username: true,
        xUserId: true,
        isActive: true,
        lastActivity: true,
        createdAt: true,
      }
    })

    // Get user info
    const userInfo = {
      id: user.id,
      email: user.email,
      clerkId: user.clerkId,
      createdAt: user.createdAt,
    }

    return NextResponse.json({
      user: userInfo,
      xAccounts,
      totalXAccounts: xAccounts.length,
      activeXAccounts: xAccounts.filter(x => x.isActive).length,
      debug: {
        queriedUserId: user.id,
        queriedClerkId: clerkId,
      }
    })
  } catch (error) {
    console.error('Debug X accounts error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to debug X accounts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}