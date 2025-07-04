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

    // Sanitize content function
    function sanitizeContent(input: any): string {
      if (typeof input === 'string') {
        // Remove or escape problematic characters
        return input
          .replace(/\\x[0-9a-fA-F]{0,1}(?![0-9a-fA-F])/g, '') // Remove incomplete hex escapes
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
          .replace(/\\/g, '\\\\') // Escape backslashes
          .replace(/"/g, '\\"') // Escape quotes
      } else {
        // For objects/arrays, stringify carefully
        try {
          return JSON.stringify(input, (key, value) => {
            if (typeof value === 'string') {
              return value
                .replace(/\\x[0-9a-fA-F]{0,1}(?![0-9a-fA-F])/g, '')
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            }
            return value
          })
        } catch {
          return JSON.stringify({ error: 'Could not serialize content' })
        }
      }
    }

    // Validate and sanitize content
    let contentString: string
    try {
      contentString = sanitizeContent(content)
      console.log('Sanitized content length:', contentString.length)
    } catch (error) {
      console.error('Error processing content:', error)
      return NextResponse.json({ 
        error: 'Invalid content format - could not sanitize content',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 })
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

    // Create preview text safely
    let previewText: string
    try {
      if (typeof content === 'string') {
        previewText = content.substring(0, 100)
      } else if (Array.isArray(content) && content[0]?.content) {
        previewText = content[0].content.substring(0, 100)
      } else {
        previewText = 'Tweet content'
      }
      if (previewText.length === 100) {
        previewText += '...'
      }
    } catch (previewError) {
      console.error('Error creating preview text:', previewError)
      previewText = 'Tweet content'
    }

    console.log('Updating scheduled content with:', {
      id: params.id,
      contentLength: contentString.length,
      previewText,
      scheduledFor: scheduledDate
    })

    // Update the scheduled content
    const updatedContent = await prisma.scheduledContent.update({
      where: { id: params.id },
      data: {
        content: contentString,
        previewText,
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