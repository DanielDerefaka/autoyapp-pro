import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { xApiClient } from '@/lib/x-api'
import { z } from 'zod'

const updateReplySchema = z.object({
  replyContent: z.string().max(280).optional(),
  scheduledFor: z.string().datetime().optional(),
  status: z.enum(['pending', 'cancelled']).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const reply = await prisma.replyQueue.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        tweet: {
          include: {
            targetUser: {
              select: {
                targetUsername: true,
              },
            },
          },
        },
        xAccount: {
          select: {
            username: true,
          },
        },
      },
    })

    if (!reply) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
    }

    return NextResponse.json(reply)
  } catch (error) {
    console.error('Error fetching reply:', error)
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

    const { id } = await params
    const body = await request.json()
    const validatedData = updateReplySchema.parse(body)

    // Check if reply exists and belongs to user
    const existingReply = await prisma.replyQueue.findFirst({
      where: {
        id,
        userId: user.id,
        status: 'pending', // Only allow updates to pending replies
      },
    })

    if (!existingReply) {
      return NextResponse.json(
        { error: 'Reply not found or cannot be updated' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    
    if (validatedData.replyContent) {
      updateData.replyContent = validatedData.replyContent
    }
    
    if (validatedData.scheduledFor) {
      updateData.scheduledFor = new Date(validatedData.scheduledFor)
    }
    
    if (validatedData.status) {
      updateData.status = validatedData.status
    }

    const updatedReply = await prisma.replyQueue.update({
      where: { id },
      data: updateData,
      include: {
        tweet: {
          include: {
            targetUser: {
              select: {
                targetUsername: true,
              },
            },
          },
        },
        xAccount: {
          select: {
            username: true,
          },
        },
      },
    })

    return NextResponse.json(updatedReply)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating reply:', error)
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

    const { id } = await params

    const reply = await prisma.replyQueue.findFirst({
      where: {
        id,
        userId: user.id,
        status: 'pending',
      },
    })

    if (!reply) {
      return NextResponse.json(
        { error: 'Reply not found or cannot be deleted' },
        { status: 404 }
      )
    }

    await prisma.replyQueue.update({
      where: { id },
      data: { status: 'cancelled' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting reply:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}