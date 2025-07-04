import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AnalyticsService } from '@/lib/analytics'
import { z } from 'zod'

const targetAnalyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    }

    // Validate query parameters
    const validatedParams = targetAnalyticsQuerySchema.parse(queryParams)

    // Build filters
    const filters = {
      ...(validatedParams.startDate && { startDate: new Date(validatedParams.startDate) }),
      ...(validatedParams.endDate && { endDate: new Date(validatedParams.endDate) }),
    }

    const targetAnalytics = await AnalyticsService.getTargetAnalytics(user.id, filters)

    // Get summary statistics
    const summary = {
      totalTargets: targetAnalytics.length,
      totalTweets: targetAnalytics.reduce((sum, target) => sum + target.totalTweets, 0),
      totalReplies: targetAnalytics.reduce((sum, target) => sum + target.repliesSent, 0),
      totalEngagements: targetAnalytics.reduce((sum, target) => sum + target.engagementScore, 0),
      averageEngagementPerTarget: targetAnalytics.length > 0
        ? targetAnalytics.reduce((sum, target) => sum + target.engagementScore, 0) / targetAnalytics.length
        : 0,
    }

    return NextResponse.json({
      targets: targetAnalytics,
      summary,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error fetching target analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}