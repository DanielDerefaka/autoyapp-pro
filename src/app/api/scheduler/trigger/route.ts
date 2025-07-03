import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { TweetScheduler } from '@/lib/scheduler'

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔥 Manual scheduler trigger requested by user:', clerkId)
    
    const result = await TweetScheduler.triggerNow()
    
    return NextResponse.json({
      success: true,
      message: 'Scheduler triggered successfully',
      result
    })

  } catch (error) {
    console.error('Error triggering scheduler:', error)
    return NextResponse.json(
      { error: 'Failed to trigger scheduler' },
      { status: 500 }
    )
  }
}