import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rate-limiter';

// GET /api/rate-limits/status - Get current rate limit status
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const endpoints = [
      'tweets/post',
      'tweets/lookup', 
      'users/lookup',
      'search/recent'
    ];

    const status = {};

    for (const endpoint of endpoints) {
      const limitCheck = await rateLimiter.checkLimit(endpoint);
      const timeUntilReset = rateLimiter.getTimeUntilReset(endpoint);
      
      status[endpoint] = {
        allowed: limitCheck.allowed,
        remaining: limitCheck.remaining || 0,
        resetTime: limitCheck.resetTime,
        timeUntilReset,
        timeUntilResetMinutes: Math.ceil(timeUntilReset / (60 * 1000)),
      };
    }

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error getting rate limit status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}