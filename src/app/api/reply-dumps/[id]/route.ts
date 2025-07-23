import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateReplyDumpSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  tags: z.array(z.string()).optional(),
  tone: z.enum(['professional', 'casual', 'witty', 'supportive', 'neutral']).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/reply-dumps/[id] - Get specific reply dump
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const replyDump = await prisma.replyDump.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!replyDump) {
      return NextResponse.json({ error: 'Reply dump not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...replyDump,
      tags: JSON.parse(replyDump.tags),
    });
  } catch (error) {
    console.error('Error fetching reply dump:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/reply-dumps/[id] - Update reply dump
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const validatedData = updateReplyDumpSchema.parse(body);

    const updateData: any = {};
    if (validatedData.content !== undefined) updateData.content = validatedData.content;
    if (validatedData.tone !== undefined) updateData.tone = validatedData.tone;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    if (validatedData.tags !== undefined) updateData.tags = JSON.stringify(validatedData.tags);

    const replyDump = await prisma.replyDump.updateMany({
      where: {
        id: params.id,
        userId: user.id,
      },
      data: updateData,
    });

    if (replyDump.count === 0) {
      return NextResponse.json({ error: 'Reply dump not found' }, { status: 404 });
    }

    const updatedDump = await prisma.replyDump.findUnique({
      where: { id: params.id },
    });

    return NextResponse.json({
      ...updatedDump,
      tags: JSON.parse(updatedDump!.tags),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating reply dump:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/reply-dumps/[id] - Delete reply dump
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const deletedDump = await prisma.replyDump.deleteMany({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (deletedDump.count === 0) {
      return NextResponse.json({ error: 'Reply dump not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Reply dump deleted successfully' });
  } catch (error) {
    console.error('Error deleting reply dump:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}