import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { QueueManager } from '@/lib/queue'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all users with active target users
    const usersWithTargets = await prisma.user.findMany({
      where: {
        targetUsers: {
          some: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        targetUsers: {
          where: { isActive: true },
          select: {
            id: true,
            lastScraped: true,
          },
        },
      },
    })

    let jobsScheduled = 0

    for (const user of usersWithTargets) {
      try {
        // Check if we should scrape for this user
        // Only scrape if it's been more than 30 minutes since last scrape
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
        
        const targetsNeedingScraping = user.targetUsers.filter(
          target => !target.lastScraped || target.lastScraped < thirtyMinutesAgo
        )

        if (targetsNeedingScraping.length > 0) {
          await QueueManager.addScrapingJob({
            userId: user.id,
          })
          jobsScheduled++
        }
      } catch (error) {
        console.error(`Failed to schedule scraping for user ${user.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      usersProcessed: usersWithTargets.length,
      jobsScheduled,
    })
  } catch (error) {
    console.error('Error in scrape-tweets cron:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}