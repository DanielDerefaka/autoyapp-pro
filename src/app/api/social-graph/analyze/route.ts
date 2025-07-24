import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SocialGraphAnalyzer } from '@/lib/social-graph-analyzer';
import { SocialGraphRequest } from '@/types/social-graph';
import { ErrorLogger } from '@/lib/error-logger';

const analyzeRequestSchema = z.object({
  targetUsernames: z.array(z.string()).optional(),
  analysisType: z.enum(['full', 'relationships', 'influence', 'communities']).default('full'),
  maxDepth: z.number().min(1).max(3).default(2),
  includeMetrics: z.boolean().default(true),
});

// POST /api/social-graph/analyze - Analyze social graph
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = analyzeRequestSchema.parse(body);

    const analyzer = new SocialGraphAnalyzer(user.id);
    
    const analysisRequest: SocialGraphRequest = {
      userId: user.id,
      ...validatedData,
    };

    const result = await analyzer.analyzeSocialGraph(analysisRequest);

    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    await ErrorLogger.logApiError({
      error: error as Error,
      request,
      endpoint: '/api/social-graph/analyze',
      method: 'POST',
    });

    console.error('Error analyzing social graph:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/social-graph/analyze - Get cached analysis
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

    // Get latest analysis from cache or database
    const [nodes, relations, clusters] = await Promise.all([
      prisma.socialNode.count({ where: { userId: user.id } }),
      prisma.socialRelation.count({ where: { userId: user.id } }),
      prisma.socialCluster.groupBy({
        by: ['clusterId'],
        where: { userId: user.id },
        _count: { nodeId: true },
      }),
    ]);

    const summary = {
      networkSize: nodes,
      relationCount: relations,
      communityCount: clusters.length,
      lastUpdated: new Date(),
      status: nodes > 0 ? 'available' : 'no_data',
    };

    return NextResponse.json(summary);

  } catch (error) {
    await ErrorLogger.logApiError({
      error: error as Error,
      request,
      endpoint: '/api/social-graph/analyze',
      method: 'GET',
    });

    console.error('Error getting social graph summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}