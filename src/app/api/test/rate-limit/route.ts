import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter } from '@/lib/rate-limiter'

/**
 * Test endpoint for rate limiting functionality
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, targetUserId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Test rate limit check
    const rateLimitResult = await RateLimiter.checkReplyRateLimit(userId, targetUserId)
    
    // Calculate optimal delay
    const optimalDelay = await RateLimiter.calculateOptimalDelay(userId, targetUserId)

    return NextResponse.json({
      success: true,
      rateLimit: rateLimitResult,
      optimalDelay: {
        milliseconds: optimalDelay,
        minutes: Math.ceil(optimalDelay / 1000 / 60),
        scheduledFor: new Date(Date.now() + optimalDelay).toISOString()
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Rate limit test error:', error)
    return NextResponse.json(
      { 
        error: 'Rate limit test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Rate limiting test endpoint',
    usage: 'POST with { userId: "user123", targetUserId?: "target456" }',
    timestamp: new Date().toISOString()
  })
}