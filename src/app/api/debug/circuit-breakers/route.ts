import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { twitterCircuitBreakers } from '@/lib/circuit-breaker';

// GET /api/debug/circuit-breakers - Debug circuit breaker status
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const states = {
      postTweet: twitterCircuitBreakers.postTweet.getState(),
      tokenRefresh: twitterCircuitBreakers.tokenRefresh.getState(),
      userLookup: twitterCircuitBreakers.userLookup.getState(),
    };

    const summary = {
      totalCircuits: Object.keys(states).length,
      openCircuits: Object.values(states).filter(s => s.state === 'OPEN').length,
      closedCircuits: Object.values(states).filter(s => s.state === 'CLOSED').length,
      halfOpenCircuits: Object.values(states).filter(s => s.state === 'HALF_OPEN').length,
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      circuitBreakers: states,
      summary
    });

  } catch (error) {
    console.error('Error getting circuit breaker debug info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/debug/circuit-breakers/reset - Reset circuit breakers
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { circuitBreaker } = await request.json();

    if (circuitBreaker === 'all') {
      twitterCircuitBreakers.postTweet.reset();
      twitterCircuitBreakers.tokenRefresh.reset();
      twitterCircuitBreakers.userLookup.reset();
      
      return NextResponse.json({
        message: 'All circuit breakers reset successfully',
        timestamp: new Date().toISOString()
      });
    } else if (circuitBreaker && twitterCircuitBreakers[circuitBreaker as keyof typeof twitterCircuitBreakers]) {
      twitterCircuitBreakers[circuitBreaker as keyof typeof twitterCircuitBreakers].reset();
      
      return NextResponse.json({
        message: `Circuit breaker '${circuitBreaker}' reset successfully`,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        error: 'Invalid circuit breaker name. Available: postTweet, tokenRefresh, userLookup, all'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error resetting circuit breakers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}