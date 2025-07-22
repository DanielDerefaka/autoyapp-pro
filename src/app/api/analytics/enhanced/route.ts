import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AnalyticsService } from '@/lib/analytics'
import { z } from 'zod'

const analyticsRequestSchema = z.object({
  type: z.enum(['engagement', 'target', 'performance']),
  period: z.enum(['daily', 'weekly', 'monthly']).optional(),
  filters: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    targetUserId: z.string().optional(),
    engagementType: z.string().optional()
  }).optional()
})

/**
 * Enhanced Analytics API with improved error handling and data validation
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = analyticsRequestSchema.parse(body)
    
    const { type, period = 'monthly', filters = {} } = validatedData

    console.log(`📊 Enhanced analytics request: ${type}, period: ${period}`)

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse date filters
    const parsedFilters = {
      ...filters,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined
    }

    // Get analytics with comprehensive error handling
    const result = await AnalyticsService.getAnalyticsWithErrorHandling(
      user.id, 
      type, 
      parsedFilters, 
      period
    )

    // Add metadata for frontend
    const response = {
      ...result,
      userId: user.id,
      type,
      period,
      filters: parsedFilters,
      debug: {
        hasDatabase: true,
        userExists: true,
        filtersApplied: Object.keys(parsedFilters).length > 0
      }
    }

    // Set appropriate status code based on whether we have data
    const statusCode = result.error ? 200 : 200 // Always 200, let frontend handle empty states
    
    console.log(`✅ Enhanced analytics response: hasData=${result.hasData}, error=${!!result.error}`)

    return NextResponse.json(response, { status: statusCode })

  } catch (error) {
    console.error('Enhanced analytics API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters', 
          details: error.errors,
          hasData: false,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Analytics service temporarily unavailable',
        details: 'Please try again in a moment',
        hasData: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for analytics metadata and available options
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user analytics summary
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        _count: {
          select: {
            targetUsers: true,
            replyQueue: true,
            analytics: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get date range of available data
    const [firstReply, lastReply, firstEngagement, lastEngagement] = await Promise.all([
      prisma.replyQueue.findFirst({
        where: { userId: user.id, sentAt: { not: null } },
        orderBy: { sentAt: 'asc' },
        select: { sentAt: true }
      }),
      prisma.replyQueue.findFirst({
        where: { userId: user.id, sentAt: { not: null } },
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true }
      }),
      prisma.engagementAnalytics.findFirst({
        where: { userId: user.id },
        orderBy: { trackedAt: 'asc' },
        select: { trackedAt: true }
      }),
      prisma.engagementAnalytics.findFirst({
        where: { userId: user.id },
        orderBy: { trackedAt: 'desc' },
        select: { trackedAt: true }
      })
    ])

    const hasData = user._count.replyQueue > 0 || user._count.analytics > 0

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        hasData,
        counts: {
          targets: user._count.targetUsers,
          replies: user._count.replyQueue,
          analytics: user._count.analytics
        }
      },
      dataRange: {
        replies: {
          first: firstReply?.sentAt?.toISOString() || null,
          last: lastReply?.sentAt?.toISOString() || null
        },
        engagements: {
          first: firstEngagement?.trackedAt?.toISOString() || null,
          last: lastEngagement?.trackedAt?.toISOString() || null
        }
      },
      availableTypes: ['engagement', 'target', 'performance'],
      availablePeriods: ['daily', 'weekly', 'monthly'],
      recommendations: {
        bestPeriod: hasData ? (user._count.analytics > 30 ? 'weekly' : 'daily') : 'monthly',
        suggestedFilters: hasData ? ['last 30 days', 'last 7 days'] : ['all time']
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Analytics metadata error:', error)
    return NextResponse.json(
      { error: 'Failed to get analytics metadata' },
      { status: 500 }
    )
  }
}