import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorLogger } from '@/lib/error-logger';

// GET /api/error-logs/[id] - Get specific error log
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

    const errorLog = await prisma.errorLog.findUnique({
      where: { id: params.id },
    });

    if (!errorLog) {
      return NextResponse.json({ error: 'Error log not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...errorLog,
      metadata: JSON.parse(errorLog.metadata || '{}'),
    });

  } catch (error) {
    console.error('Error fetching error log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/error-logs/[id] - Mark error as resolved
export async function PATCH(
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
    const { resolved } = body;

    if (resolved) {
      await ErrorLogger.resolveError(params.id, user.email || user.id);
    } else {
      // Mark as unresolved
      await prisma.errorLog.update({
        where: { id: params.id },
        data: { resolved: false }
      });
    }

    const updatedLog = await prisma.errorLog.findUnique({
      where: { id: params.id },
    });

    return NextResponse.json({
      ...updatedLog,
      metadata: JSON.parse(updatedLog?.metadata || '{}'),
    });

  } catch (error) {
    console.error('Error updating error log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/error-logs/[id] - Delete error log
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

    await prisma.errorLog.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting error log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}