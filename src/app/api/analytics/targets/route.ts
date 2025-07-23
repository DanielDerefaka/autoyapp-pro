import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AnalyticsService } from '@/lib/analytics'
import { apiAuth } from '@/lib/auth-utils'
import { z } from 'zod'

const targetAnalyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['1d', '7d', '30d', '90d']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId, error } = await apiAuth(request)

    if (!clerkId) {
      console.log('❌ Auth failed in GET /api/analytics/targets:', error)
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    
    // Filter out null values before validation
    const queryParams: Record<string, string> = {}
    
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate') 
    const period = searchParams.get('period')
    
    if (startDate) queryParams.startDate = startDate
    if (endDate) queryParams.endDate = endDate
    if (period) queryParams.period = period

    console.log('📊 Target analytics query params:', queryParams)

    // Validate query parameters
    const validatedParams = targetAnalyticsQuerySchema.parse(queryParams)

    // Convert period to date range if provided
    let filterStartDate: Date | undefined
    let filterEndDate: Date | undefined

    if (validatedParams.period) {
      filterEndDate = new Date()
      filterStartDate = new Date()
      
      switch (validatedParams.period) {
        case '1d':
          filterStartDate.setDate(filterEndDate.getDate() - 1)
          break
        case '7d':
          filterStartDate.setDate(filterEndDate.getDate() - 7)
          break
        case '30d':
          filterStartDate.setDate(filterEndDate.getDate() - 30)
          break
        case '90d':
          filterStartDate.setDate(filterEndDate.getDate() - 90)
          break
      }
    } else if (validatedParams.startDate) {
      filterStartDate = new Date(validatedParams.startDate)
    } else if (validatedParams.endDate) {
      filterEndDate = new Date(validatedParams.endDate)
    }

    // Build filters
    const filters = {
      ...(filterStartDate && { startDate: filterStartDate }),
      ...(filterEndDate && { endDate: filterEndDate }),
    }

    try {
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
    } catch (analyticsError) {
      console.error('Target analytics service error:', analyticsError)
      
      // Return empty but valid structure for mobile app
      return NextResponse.json({
        targets: [],
        summary: {
          totalTargets: 0,
          totalTweets: 0,
          totalReplies: 0,
          totalEngagements: 0,
          averageEngagementPerTarget: 0,
        }
      })
    }
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