import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ErrorLogger } from '@/lib/error-logger';

const createErrorLogSchema = z.object({
  errorType: z.enum(['API_ERROR', 'CLIENT_ERROR', 'AUTH_ERROR', 'SYSTEM_ERROR', 'DATABASE_ERROR']),
  errorMessage: z.string(),
  errorStack: z.string().optional(),
  component: z.string().optional(),
  action: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// GET /api/error-logs - Get error logs (admin only for now)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, allow any authenticated user to view logs
    // In production, you might want to restrict this to admin users
    
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const errorType = url.searchParams.get('errorType');
    const severity = url.searchParams.get('severity');
    const resolved = url.searchParams.get('resolved');
    const timeRange = url.searchParams.get('timeRange') || 'day';

    // Build where clause
    const whereClause: any = {};
    
    if (errorType) {
      whereClause.errorType = errorType;
    }
    
    if (severity) {
      whereClause.severity = severity;
    }
    
    if (resolved !== null && resolved !== '') {
      whereClause.resolved = resolved === 'true';
    }

    // Time range filter
    const now = new Date();
    let startDate: Date;
    switch (timeRange) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    whereClause.timestamp = { gte: startDate };

    // Get total count and logs
    const [totalCount, logs] = await Promise.all([
      prisma.errorLog.count({ where: whereClause }),
      prisma.errorLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          userId: true,
          userEmail: true,
          errorType: true,
          errorMessage: true,
          errorStack: true,
          endpoint: true,
          method: true,
          userAgent: true,
          ipAddress: true,
          requestBody: true,
          responseStatus: true,
          metadata: true,
          timestamp: true,
          resolved: true,
          severity: true,
        }
      })
    ]);

    // Get error statistics
    const stats = await ErrorLogger.getErrorStats(timeRange as any);

    const hasMore = offset + limit < totalCount;

    return NextResponse.json({
      data: logs.map(log => ({
        ...log,
        metadata: JSON.parse(log.metadata || '{}'),
      })),
      pagination: {
        limit,
        offset,
        totalCount,
        hasMore,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats,
    });

  } catch (error) {
    console.error('Error fetching error logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/error-logs - Log a client-side error
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    let user = null;
    
    if (userId) {
      user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
    }

    const body = await request.json();
    const validatedData = createErrorLogSchema.parse(body);

    // Log the error using our ErrorLogger
    if (validatedData.errorType === 'CLIENT_ERROR') {
      await ErrorLogger.logClientError({
        error: validatedData.errorMessage,
        userId: user?.id,
        userEmail: user?.email,
        component: validatedData.component,
        action: validatedData.action,
        metadata: validatedData.metadata,
      });
    } else if (validatedData.errorType === 'AUTH_ERROR') {
      await ErrorLogger.logAuthError({
        error: validatedData.errorMessage,
        userId: user?.id,
        userEmail: user?.email,
        metadata: validatedData.metadata,
      });
    } else {
      // Generic error logging
      await ErrorLogger.logApiError({
        error: new Error(validatedData.errorMessage),
        userId: user?.id,
        userEmail: user?.email,
        request,
        metadata: validatedData.metadata,
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error logging client error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}