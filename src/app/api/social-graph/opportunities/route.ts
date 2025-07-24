import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { SocialGraphAnalyzer } from '@/lib/social-graph-analyzer';
import { ErrorLogger } from '@/lib/error-logger';

// GET /api/social-graph/opportunities - Get engagement opportunities
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const opportunityType = url.searchParams.get('type');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

    const analyzer = new SocialGraphAnalyzer(user.id);
    
    // Get a quick analysis to identify opportunities
    const result = await analyzer.analyzeSocialGraph({
      userId: user.id,
      analysisType: 'influence',
      maxDepth: 2,
      includeMetrics: false,
    });

    let opportunities = result.opportunities;

    // Filter by type if specified
    if (opportunityType) {
      opportunities = opportunities.filter(opp => opp.opportunityType === opportunityType);
    }

    // Limit results
    opportunities = opportunities.slice(0, limit);

    return NextResponse.json({
      data: opportunities,
      metadata: {
        totalAvailable: result.opportunities.length,
        analysisDate: result.lastUpdated,
        networkSize: result.analysis.networkSize,
      },
    });

  } catch (error) {
    await ErrorLogger.logApiError({
      error: error as Error,
      request,
      endpoint: '/api/social-graph/opportunities',
      method: 'GET',
    });

    console.error('Error fetching engagement opportunities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}