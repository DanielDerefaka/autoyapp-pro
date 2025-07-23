import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AnalyticsService } from '@/lib/analytics'
import { apiAuth } from '@/lib/auth-utils'
import { z } from 'zod'

const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['1d', '7d', '30d', '90d']).optional(),
  targetUserId: z.string().cuid().optional(),
  engagementType: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId, error } = await apiAuth(request)

    if (!clerkId) {
      console.log('❌ Auth failed in GET /api/analytics/engagement:', error)
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
    const targetUserId = searchParams.get('targetUserId')
    const engagementType = searchParams.get('engagementType')
    
    if (startDate) queryParams.startDate = startDate
    if (endDate) queryParams.endDate = endDate
    if (period) queryParams.period = period
    if (targetUserId) queryParams.targetUserId = targetUserId
    if (engagementType) queryParams.engagementType = engagementType

    console.log('📊 Analytics query params:', queryParams)

    // Validate query parameters
    const validatedParams = analyticsQuerySchema.parse(queryParams)

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
      ...(validatedParams.targetUserId && { targetUserId: validatedParams.targetUserId }),
      ...(validatedParams.engagementType && { engagementType: validatedParams.engagementType }),
    }

    try {
      const metrics = await AnalyticsService.getEngagementMetrics(user.id, filters)
      return NextResponse.json(metrics)
    } catch (analyticsError) {
      console.error('Analytics service error:', analyticsError)
      
      // Return empty but valid analytics structure for mobile app
      const emptyMetrics = {
        totalReplies: 0,
        sentReplies: 0,
        failedReplies: 0,
        pendingReplies: 0,
        successRate: 0,
        averageResponseTime: 0,
        engagementsByType: {},
        dailyStats: []
      }
      
      return NextResponse.json(emptyMetrics)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error fetching engagement analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}