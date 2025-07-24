import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rate-limiter';

// GET /api/debug/rate-limits - Debug rate limit status
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
        resetTime: limitCheck.resetTime ? new Date(limitCheck.resetTime).toISOString() : null,
        timeUntilReset,
        timeUntilResetMinutes: Math.ceil(timeUntilReset / (60 * 1000)),
        status: limitCheck.allowed ? 'available' : 'rate_limited'
      };
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      rateLimits: status,
      summary: {
        totalEndpoints: endpoints.length,
        availableEndpoints: Object.values(status).filter((s: any) => s.allowed).length,
        rateLimitedEndpoints: Object.values(status).filter((s: any) => !s.allowed).length,
      }
    });

  } catch (error) {
    console.error('Error getting rate limit debug info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}