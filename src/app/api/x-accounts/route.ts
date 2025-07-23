import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId, error } = await apiAuth(request)

    if (!clerkId) {
      console.log('❌ Auth failed in GET /api/x-accounts:', error)
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        xAccounts: {
          select: {
            id: true,
            username: true,
            isActive: true,
            lastActivity: true,
            createdAt: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user.xAccounts)

  } catch (error) {
    console.error('Error fetching X accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch X accounts' },
      { status: 500 }
    )
  }
}