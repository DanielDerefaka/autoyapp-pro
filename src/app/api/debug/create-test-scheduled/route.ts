import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/debug/create-test-scheduled - Create test scheduled content
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and their X accounts
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { xAccounts: { where: { isActive: true } } }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.xAccounts.length === 0) {
      return NextResponse.json({ 
        error: 'No active X account found. Please connect your Twitter account first.' 
      }, { status: 400 });
    }

    const xAccount = user.xAccounts[0];

    // Create a test scheduled tweet for 1 minute from now
    const scheduledFor = new Date(Date.now() + 60 * 1000); // 1 minute from now
    
    const testContent = [
      {
        content: `🧪 Test scheduled tweet ${new Date().toLocaleTimeString()} - This is a test of the scheduler system!`
      }
    ];

    const scheduledContent = await prisma.scheduledContent.create({
      data: {
        userId: user.id,
        xAccountId: xAccount.id,
        type: 'tweet',
        content: JSON.stringify(testContent),
        previewText: testContent[0].content.substring(0, 100),
        scheduledFor: scheduledFor,
        status: 'scheduled',
        tweetCount: 1,
        images: JSON.stringify([])
      }
    });

    return NextResponse.json({
      message: 'Test scheduled content created',
      scheduledContent: {
        id: scheduledContent.id,
        scheduledFor: scheduledContent.scheduledFor,
        content: testContent[0].content,
        status: scheduledContent.status
      },
      nextSchedulerRun: 'Check logs in ~1 minute',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error creating test scheduled content:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create test content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}