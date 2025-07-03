import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { content, scheduledFor } = await request.json()

    if (!content || !scheduledFor) {
      return NextResponse.json({ error: 'Content and scheduled time are required' }, { status: 400 })
    }

    const scheduledDate = new Date(scheduledFor)
    if (scheduledDate <= new Date()) {
      return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 })
    }

    // Check if the content belongs to the user
    const existingContent = await prisma.scheduledContent.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!existingContent) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Update the scheduled content
    const updatedContent = await prisma.scheduledContent.update({
      where: { id: params.id },
      data: {
        content: typeof content === 'string' ? content : JSON.stringify(content),
        previewText: (typeof content === 'string' ? content : content[0]?.content || '').substring(0, 100) + '...',
        scheduledFor: scheduledDate,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      content: {
        id: updatedContent.id,
        type: updatedContent.type,
        content: updatedContent.content,
        previewText: updatedContent.previewText,
        scheduledFor: updatedContent.scheduledFor.toISOString(),
        status: updatedContent.status,
        tweetCount: updatedContent.tweetCount
      }
    })

  } catch (error) {
    console.error('Error updating scheduled content:', error)
    return NextResponse.json(
      { error: 'Failed to update scheduled content' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if the content belongs to the user
    const existingContent = await prisma.scheduledContent.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!existingContent) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Delete related reply queue entries
    await prisma.replyQueue.deleteMany({
      where: {
        userId: user.id,
        tweetId: {
          startsWith: `scheduled_${params.id}_`
        }
      }
    })

    // Delete the scheduled content
    await prisma.scheduledContent.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting scheduled content:', error)
    return NextResponse.json(
      { error: 'Failed to delete scheduled content' },
      { status: 500 }
    )
  }
}