import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createReplyDumpSchema = z.object({
  content: z.string().min(1, 'Content is required').max(1000, 'Content too long'),
  tags: z.array(z.string()).default([]),
  tone: z.enum(['professional', 'casual', 'witty', 'supportive', 'neutral']).default('neutral'),
});

const updateReplyDumpSchema = createReplyDumpSchema.partial();

// GET /api/reply-dumps - Get all reply dumps for user
export async function GET() {
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

    const replyDumps = await prisma.replyDump.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Parse tags from JSON strings
    const formattedDumps = replyDumps.map(dump => ({
      ...dump,
      tags: JSON.parse(dump.tags),
    }));

    return NextResponse.json(formattedDumps);
  } catch (error) {
    console.error('Error fetching reply dumps:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/reply-dumps - Create new reply dump
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
    const validatedData = createReplyDumpSchema.parse(body);

    const replyDump = await prisma.replyDump.create({
      data: {
        userId: user.id,
        content: validatedData.content,
        tags: JSON.stringify(validatedData.tags),
        tone: validatedData.tone,
      },
    });

    return NextResponse.json({
      ...replyDump,
      tags: JSON.parse(replyDump.tags),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating reply dump:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}