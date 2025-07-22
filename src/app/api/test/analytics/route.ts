import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsService } from '@/lib/analytics'
import { prisma } from '@/lib/prisma'

/**
 * Test endpoint for analytics functionality without authentication
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      type = 'engagement', 
      period = 'monthly',
      testMode = true,
      createSampleData = false
    } = await request.json()

    console.log(`🧪 Testing analytics: type=${type}, period=${period}`)

    // Get a test user or create sample data
    let testUserId = 'test-user-analytics'
    
    if (createSampleData) {
      // Create some sample analytics data for testing
      await createSampleAnalyticsData(testUserId)
    }

    // Test analytics service with error handling
    const result = await AnalyticsService.getAnalyticsWithErrorHandling(
      testUserId,
      type as any,
      {},
      period as any
    )

    return NextResponse.json({
      success: true,
      testMode,
      type,
      period,
      result,
      analysis: {
        hasData: result.hasData,
        hasError: !!result.error,
        dataKeys: result.data ? Object.keys(result.data) : [],
        timestamp: result.timestamp
      },
      metadata: {
        testUserId,
        sampleDataCreated: createSampleData
      }
    })

  } catch (error) {
    console.error('Analytics test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Analytics test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/test/analytics',
    description: 'Test analytics functionality without authentication',
    usage: 'POST with { type?, period?, testMode?, createSampleData? }',
    availableTypes: ['engagement', 'target', 'performance'],
    availablePeriods: ['daily', 'weekly', 'monthly'],
    examples: {
      basic: {
        type: 'engagement',
        period: 'monthly',
        testMode: true
      },
      withSampleData: {
        type: 'performance',
        period: 'weekly',
        createSampleData: true,
        testMode: true
      }
    }
  })
}

/**
 * Create sample analytics data for testing
 */
async function createSampleAnalyticsData(userId: string): Promise<void> {
  try {
    console.log('📊 Creating sample analytics data...')
    
    // Create sample engagement analytics
    const sampleEngagements = []
    const now = new Date()
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))
      sampleEngagements.push({
        userId,
        engagementType: ['reply', 'like', 'retweet', 'mention'][i % 4],
        engagementValue: Math.floor(Math.random() * 10) + 1,
        trackedAt: date
      })
    }

    // Note: We can't actually insert this data without proper user/table setup
    // This is just for demonstrating the data structure
    console.log(`✅ Would create ${sampleEngagements.length} sample engagement records`)
    
  } catch (error) {
    console.error('Failed to create sample data:', error)
  }
}