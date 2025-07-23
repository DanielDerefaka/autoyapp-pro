import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId, error } = await apiAuth(request)

    if (!clerkId) {
      console.log('❌ Auth failed in /api/auth/user:', error)
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        xAccounts: true,
        subscription: true,
        _count: {
          select: {
            targetUsers: true,
            replyQueue: true,
            templates: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkId, error } = await apiAuth(request)

    if (!clerkId) {
      console.log('❌ Auth failed in PUT /api/auth/user:', error)
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    const user = await prisma.user.update({
      where: { clerkId },
      data: { name },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}