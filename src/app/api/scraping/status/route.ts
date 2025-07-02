import { NextResponse } from 'next/server'
import { scrapeLimiter } from '@/lib/scrape-limiter'

export async function GET() {
  try {
    const status = scrapeLimiter.getStatus()
    
    return NextResponse.json({
      ...status,
      nextAllowedTimeFormatted: status.nextAllowedTime 
        ? new Date(status.nextAllowedTime).toLocaleTimeString()
        : null,
      canScrapeNow: scrapeLimiter.canScrape(1).allowed,
      scrapingEnabled: process.env.ENABLE_SCRAPING_FALLBACK === 'true',
      maxUsersPerSession: parseInt(process.env.MAX_SCRAPING_USERS_PER_SESSION || '3')
    })
  } catch (error) {
    console.error('Error getting scraping status:', error)
    return NextResponse.json(
      { error: 'Failed to get scraping status' },
      { status: 500 }
    )
  }
}