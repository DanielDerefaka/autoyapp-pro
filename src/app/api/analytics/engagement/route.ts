import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AnalyticsService } from '@/lib/analytics'
import { z } from 'zod'

const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  targetUserId: z.string().cuid().optional(),
  engagementType: z.string().optional(),
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
      targetUserId: searchParams.get('targetUserId'),
      engagementType: searchParams.get('engagementType'),
    }

    // Validate query parameters
    const validatedParams = analyticsQuerySchema.parse(queryParams)

    // Build filters
    const filters = {
      ...(validatedParams.startDate && { startDate: new Date(validatedParams.startDate) }),
      ...(validatedParams.endDate && { endDate: new Date(validatedParams.endDate) }),
      ...(validatedParams.targetUserId && { targetUserId: validatedParams.targetUserId }),
      ...(validatedParams.engagementType && { engagementType: validatedParams.engagementType }),
    }

    const metrics = await AnalyticsService.getEngagementMetrics(user.id, filters)

    return NextResponse.json(metrics)
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