import { NextRequest, NextResponse } from 'next/server'
import { autopilotMonitor } from '@/lib/autopilot-monitor'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Invalid cron authorization')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Autopilot monitoring cron job started at', new Date().toISOString())

    // Run autopilot health check
    await autopilotMonitor.checkAutopilotHealth()

    return NextResponse.json({
      success: true,
      message: 'Autopilot monitoring completed',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Autopilot monitoring cron job failed:', error)
    return NextResponse.json(
      { 
        error: 'Autopilot monitoring failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Test endpoint for development
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
    console.log('🧪 Testing autopilot monitoring...')
    await autopilotMonitor.checkAutopilotHealth()
    
    return NextResponse.json({
      success: true,
      message: 'Autopilot monitoring test completed',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Autopilot monitoring test failed:', error)
    return NextResponse.json(
      { 
        error: 'Autopilot monitoring test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}