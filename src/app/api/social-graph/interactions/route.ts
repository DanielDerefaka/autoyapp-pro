import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SocialGraphAnalyzer } from '@/lib/social-graph-analyzer';
import { ErrorLogger } from '@/lib/error-logger';

const recordInteractionSchema = z.object({
  sourceUsername: z.string().min(1),
  targetUsername: z.string().min(1),
  interactionType: z.enum(['like', 'reply', 'retweet', 'quote', 'mention']),
  tweetId: z.string().optional(),
  content: z.string().optional(),
  sentimentScore: z.number().min(-1).max(1).optional(),
  timestamp: z.string().datetime().transform(s => new Date(s)),
});

// GET /api/social-graph/interactions - Get social interactions
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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const interactionType = url.searchParams.get('interactionType');
    const nodeId = url.searchParams.get('nodeId');

    const whereClause: any = { userId: user.id };
    if (interactionType) {
      whereClause.interactionType = interactionType;
    }
    if (nodeId) {
      whereClause.nodeId = nodeId;
    }

    const [totalCount, interactions] = await Promise.all([
      prisma.socialInteraction.count({ where: whereClause }),
      prisma.socialInteraction.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        include: {
          node: {
            select: {
              username: true,
              displayName: true,
              profileImageUrl: true,
              isVerified: true,
            },
          },
        },
      }),
    ]);

    const hasMore = offset + limit < totalCount;

    return NextResponse.json({
      data: interactions.map(interaction => ({
        ...interaction,
        metadata: JSON.parse(interaction.metadata),
      })),
      pagination: {
        limit,
        offset,
        totalCount,
        hasMore,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(totalCount / limit),
      },
    });

  } catch (error) {
    await ErrorLogger.logApiError({
      error: error as Error,
      request,
      endpoint: '/api/social-graph/interactions',
      method: 'GET',
    });

    console.error('Error fetching social interactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/social-graph/interactions - Record social interaction
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
    const validatedData = recordInteractionSchema.parse(body);

    const analyzer = new SocialGraphAnalyzer(user.id);
    await analyzer.recordInteraction(validatedData);

    return NextResponse.json({ success: true });

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
      endpoint: '/api/social-graph/interactions',
      method: 'POST',
    });

    console.error('Error recording social interaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}