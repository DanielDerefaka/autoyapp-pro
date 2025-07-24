import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SocialGraphAnalyzer } from '@/lib/social-graph-analyzer';
import { ErrorLogger } from '@/lib/error-logger';

const createNodeSchema = z.object({
  username: z.string().min(1),
  displayName: z.string().optional(),
  profileImageUrl: z.string().url().optional(),
  followerCount: z.number().min(0).default(0),
  followingCount: z.number().min(0).default(0),
  tweetCount: z.number().min(0).default(0),
  isVerified: z.boolean().default(false),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
});

// GET /api/social-graph/nodes - Get social nodes
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
    const sortBy = url.searchParams.get('sortBy') || 'influenceScore';
    const order = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    const [totalCount, nodes] = await Promise.all([
      prisma.socialNode.count({ where: { userId: user.id } }),
      prisma.socialNode.findMany({
        where: { userId: user.id },
        orderBy: { [sortBy]: order },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: {
              outgoingRelations: true,
              incomingRelations: true,
              interactions: true,
            },
          },
        },
      }),
    ]);

    const hasMore = offset + limit < totalCount;

    return NextResponse.json({
      data: nodes.map(node => ({
        ...node,
        topicAffinity: JSON.parse(node.topicAffinity),
        relationCount: node._count.outgoingRelations + node._count.incomingRelations,
        interactionCount: node._count.interactions,
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
      endpoint: '/api/social-graph/nodes',
      method: 'GET',
    });

    console.error('Error fetching social nodes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/social-graph/nodes - Create or update social node
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
    const validatedData = createNodeSchema.parse(body);

    const analyzer = new SocialGraphAnalyzer(user.id);
    const node = await analyzer.createOrUpdateNode(validatedData);

    return NextResponse.json(node);

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
      endpoint: '/api/social-graph/nodes',
      method: 'POST',
    });

    console.error('Error creating social node:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}