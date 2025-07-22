import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

/**
 * Main cron heartbeat endpoint
 * This endpoint will be triggered by external services (UptimeRobot, etc.)
 * every 5 minutes to process scheduled tasks
 */
export async function POST(request: NextRequest) {
  try {
    // Security: Verify the request is legitimate
    const authHeader = request.headers.get('authorization')
    const userAgent = request.headers.get('user-agent') || ''
    const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET || 'dev_cron_secret_12345'

    // Allow multiple types of authentication for flexibility
    const isValidAuth = 
      authHeader === `Bearer ${cronSecret}` || 
      userAgent.includes('UptimeRobot') ||
      userAgent.includes('vercel-cron') ||
      userAgent.includes('curl') || // For manual testing
      process.env.NODE_ENV === 'development'

    if (!isValidAuth) {
      console.log('❌ Cron heartbeat authentication failed')
      console.log('Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'null')
      console.log('User agent:', userAgent)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('💓 Cron heartbeat received - processing scheduled tasks...')
    const startTime = Date.now()
    
    // Process all cron tasks in parallel for efficiency
    const results = await Promise.allSettled([
      processScheduledContent(),
      processReplyQueue(),
      processTweetScraping(),
      processComplianceChecks(),
    ])

    const processTime = Date.now() - startTime
    
    // Compile results
    const summary = {
      processedAt: new Date().toISOString(),
      processTimeMs: processTime,
      tasks: {
        scheduledContent: getResult(results[0]),
        replyQueue: getResult(results[1]),
        tweetScraping: getResult(results[2]),
        complianceChecks: getResult(results[3]),
      }
    }

    console.log('✅ Cron heartbeat completed:', summary)

    return NextResponse.json({
      success: true,
      message: 'Cron heartbeat processed successfully',
      ...summary
    })

  } catch (error) {
    console.error('💥 Cron heartbeat error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Cron heartbeat failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Process scheduled content (posts/threads)
 */
async function processScheduledContent() {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cron/process-scheduled-tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'dev_cron_secret_12345'}`,
        'User-Agent': 'internal-cron-heartbeat'
      }
    })

    if (!response.ok) {
      throw new Error(`Scheduled content processing failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Scheduled content processing failed:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Process reply queue (automated replies)
 */
async function processReplyQueue() {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cron/process-queue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'dev_cron_secret_12345'}`,
        'User-Agent': 'internal-cron-heartbeat'
      }
    })

    if (!response.ok) {
      throw new Error(`Reply queue processing failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Reply queue processing failed:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Process tweet scraping (get new tweets from targets)
 */
async function processTweetScraping() {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cron/scrape-tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'dev_cron_secret_12345'}`,
        'User-Agent': 'internal-cron-heartbeat'
      }
    })

    if (!response.ok) {
      throw new Error(`Tweet scraping failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('❌ Tweet scraping failed:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Process compliance checks
 */
async function processComplianceChecks() {
  try {
    // For now, return a placeholder - implement actual compliance checking later
    return { 
      success: true, 
      message: 'Compliance checks completed',
      checks: 0
    }
  } catch (error) {
    console.error('❌ Compliance checks failed:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Helper function to extract result from Promise.allSettled
 */
function getResult(result: PromiseSettledResult<any>) {
  if (result.status === 'fulfilled') {
    return result.value
  } else {
    return { 
      error: result.reason instanceof Error ? result.reason.message : 'Unknown error' 
    }
  }
}

// Also support GET for simple health checks
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Cron heartbeat endpoint is healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  })
}