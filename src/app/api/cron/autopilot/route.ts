import { NextRequest, NextResponse } from 'next/server'
import { autopilotEngine } from '@/lib/autopilot-engine'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
    }

    // Check authorization (for Vercel Cron or external cron services)
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Invalid cron authorization')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Autopilot cron job started at', new Date().toISOString())

    // Run autopilot processing
    await autopilotEngine.processAutopilot()

    return NextResponse.json({
      success: true,
      message: 'Autopilot processing completed',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Autopilot cron job failed:', error)
    return NextResponse.json(
      { 
        error: 'Autopilot processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Alternative GET endpoint for testing
export async function GET(request: NextRequest) {
  // Only allow in development or with proper auth
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    console.log('🧪 Testing autopilot processing...')
    await autopilotEngine.processAutopilot()
    
    return NextResponse.json({
      success: true,
      message: 'Autopilot test completed',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Autopilot test failed:', error)
    return NextResponse.json(
      { 
        error: 'Autopilot test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}