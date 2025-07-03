import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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