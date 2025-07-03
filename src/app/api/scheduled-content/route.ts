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
      where: { clerkId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const scheduledContent = await prisma.scheduledContent.findMany({
      where: { userId: user.id },
      orderBy: { scheduledFor: 'asc' }
    })

    const formattedContent = scheduledContent.map(content => ({
      id: content.id,
      type: content.type,
      content: content.content,
      previewText: content.previewText,
      scheduledFor: content.scheduledFor.toISOString(),
      status: content.status,
      tweetCount: content.tweetCount,
      images: JSON.parse(content.images || '[]'),
      createdAt: content.createdAt.toISOString()
    }))

    return NextResponse.json(formattedContent)

  } catch (error) {
    console.error('Error fetching scheduled content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled content' },
      { status: 500 }
    )
  }
}