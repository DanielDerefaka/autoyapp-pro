import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { QueueManager } from '@/lib/queue'
import { z } from 'zod'

const queueActionSchema = z.object({
  action: z.enum(['pause', 'resume', 'clear_failed']),
  queue: z.enum(['replies', 'scraping', 'compliance', 'analytics']),
})

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, queue } = queueActionSchema.parse(body)

    switch (action) {
      case 'pause':
        await QueueManager.pauseQueue(queue)
        break
      case 'resume':
        await QueueManager.resumeQueue(queue)
        break
      case 'clear_failed':
        await QueueManager.clearFailedJobs(queue)
        break
    }

    return NextResponse.json({ 
      success: true, 
      message: `Queue ${queue} ${action} completed successfully` 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error managing queue:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}