import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateTargetSchema = z.object({
  targetUsername: z.string()
    .min(1, 'Username is required')
    .max(15, 'Username must be 15 characters or less')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .transform(val => val.replace('@', ''))
    .optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await auth()
    const clerkId = authResult?.userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await params

    const target = await prisma.targetUser.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        xAccount: {
          select: {
            username: true,
          },
        },
        tweets: {
          take: 10,
          orderBy: { publishedAt: 'desc' },
        },
        analytics: {
          take: 10,
          orderBy: { trackedAt: 'desc' },
        },
        _count: {
          select: {
            tweets: true,
            analytics: true,
          },
        },
      },
    })

    if (!target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }

    return NextResponse.json(target)
  } catch (error) {
    console.error('Error fetching target:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await auth()
    const clerkId = authResult?.userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateTargetSchema.parse(body)

    const target = await prisma.targetUser.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: validatedData,
    })

    if (target.count === 0) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }

    const updatedTarget = await prisma.targetUser.findUnique({
      where: { id },
      include: {
        xAccount: {
          select: {
            username: true,
          },
        },
      },
    })

    return NextResponse.json(updatedTarget)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating target:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await auth()
    const clerkId = authResult?.userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await params

    const target = await prisma.targetUser.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    })

    if (target.count === 0) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting target:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}