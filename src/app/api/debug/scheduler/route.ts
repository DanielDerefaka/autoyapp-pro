import { NextRequest, NextResponse } from 'next/server';
import { tweetScheduler } from '@/lib/scheduler-enhanced';

// GET /api/debug/scheduler - Get scheduler status
export async function GET(request: NextRequest) {
  try {
    const status = tweetScheduler.getStatus();
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      scheduler: status,
      message: status.isRunning ? 'Scheduler is running' : 'Scheduler is not running'
    });

  } catch (error) {
    console.error('❌ Error getting scheduler status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get scheduler status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/debug/scheduler - Control scheduler
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'start':
        tweetScheduler.start();
        return NextResponse.json({
          message: 'Scheduler started',
          status: tweetScheduler.getStatus(),
          timestamp: new Date().toISOString()
        });
        
      case 'stop':
        tweetScheduler.stop();
        return NextResponse.json({
          message: 'Scheduler stopped',
          status: tweetScheduler.getStatus(),
          timestamp: new Date().toISOString()
        });
        
      case 'trigger':
        console.log('🔥 Manual scheduler trigger via API...');
        const result = await tweetScheduler.triggerAll();
        return NextResponse.json({
          message: 'Scheduler triggered manually',
          result,
          timestamp: new Date().toISOString()
        });
        
      case 'trigger-tweets':
        console.log('🔥 Manual tweet processing trigger...');
        const tweetResult = await tweetScheduler.triggerTweetProcessing();
        return NextResponse.json({
          message: 'Tweet processing triggered',
          result: tweetResult,
          timestamp: new Date().toISOString()
        });
        
      case 'trigger-replies':
        console.log('🔥 Manual reply processing trigger...');
        const replyResult = await tweetScheduler.triggerReplyProcessing();
        return NextResponse.json({
          message: 'Reply processing triggered',
          result: replyResult,
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json({
          error: 'Invalid action. Available: start, stop, trigger, trigger-tweets, trigger-replies'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error controlling scheduler:', error);
    return NextResponse.json(
      { 
        error: 'Failed to control scheduler',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}