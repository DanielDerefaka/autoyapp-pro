import { NextRequest, NextResponse } from 'next/server'
import { EnhancedTweetScheduler } from '@/lib/scheduler-enhanced'
import { TweetScheduler } from '@/lib/scheduler'

/**
 * Test endpoint for scheduler functionality
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'
    
    const enhancedScheduler = EnhancedTweetScheduler.getInstance()
    
    switch (action) {
      case 'status':
        return NextResponse.json({
          success: true,
          enhancedScheduler: {
            status: enhancedScheduler.getStatus(),
            isRunning: enhancedScheduler.isSchedulerRunning()
          },
          legacyScheduler: {
            isRunning: TweetScheduler.isRunning()
          },
          timestamp: new Date().toISOString()
        })
        
      case 'start':
        enhancedScheduler.start()
        return NextResponse.json({
          success: true,
          message: 'Enhanced scheduler started',
          status: enhancedScheduler.getStatus()
        })
        
      case 'stop':
        enhancedScheduler.stop()
        return NextResponse.json({
          success: true,
          message: 'Enhanced scheduler stopped',
          status: enhancedScheduler.getStatus()
        })
        
      case 'trigger-tweets':
        const tweetResult = await enhancedScheduler.triggerTweetProcessing()
        return NextResponse.json({
          success: true,
          message: 'Tweet processing triggered manually',
          result: tweetResult
        })
        
      case 'trigger-replies':
        const replyResult = await enhancedScheduler.triggerReplyProcessing()
        return NextResponse.json({
          success: true,
          message: 'Reply processing triggered manually',
          result: replyResult
        })
        
      case 'trigger-all':
        const allResults = await enhancedScheduler.triggerAll()
        return NextResponse.json({
          success: true,
          message: 'All processing triggered manually',
          results: allResults
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: [
            'status', 'start', 'stop', 
            'trigger-tweets', 'trigger-replies', 'trigger-all'
          ]
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Scheduler test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Scheduler test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint for scheduler tests with custom parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, options } = body
    
    const enhancedScheduler = EnhancedTweetScheduler.getInstance(options)
    
    switch (action) {
      case 'restart':
        enhancedScheduler.stop()
        enhancedScheduler.start()
        return NextResponse.json({
          success: true,
          message: 'Enhanced scheduler restarted',
          status: enhancedScheduler.getStatus()
        })
        
      case 'configure':
        // Create new instance with custom options
        const newScheduler = EnhancedTweetScheduler.getInstance(options)
        return NextResponse.json({
          success: true,
          message: 'Scheduler configured',
          status: newScheduler.getStatus()
        })
        
      case 'stress-test':
        // Run multiple operations in parallel
        const stressResults = await Promise.allSettled([
          enhancedScheduler.triggerTweetProcessing(),
          enhancedScheduler.triggerReplyProcessing(),
          enhancedScheduler.triggerAll()
        ])
        
        return NextResponse.json({
          success: true,
          message: 'Stress test completed',
          results: stressResults.map(result => ({
            status: result.status,
            value: result.status === 'fulfilled' ? result.value : result.reason?.message
          }))
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid POST action',
          availableActions: ['restart', 'configure', 'stress-test']
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Scheduler POST test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Scheduler POST test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}