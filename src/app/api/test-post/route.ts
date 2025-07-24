import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { xApiClient } from '@/lib/x-api';
import { XTokenManager } from '@/lib/x-token-manager';

// POST /api/test-post - Test posting to X with rate limiting
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await request.json();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { xAccounts: { where: { isActive: true } } }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.xAccounts.length === 0) {
      return NextResponse.json({ 
        error: 'No X account connected',
        needsConnection: true 
      }, { status: 400 });
    }

    const xAccount = user.xAccounts[0];

    console.log(`🧪 Testing post to X for @${xAccount.username}: "${content}"`);

    // Test posting with full rate limiting and token management
    const result = await XTokenManager.withTokenRefresh(
      xAccount.id,
      async (accessToken: string) => {
        return await xApiClient.postTweet(content, {
          accessToken: accessToken,
          userId: user.id
        });
      }
    );

    console.log(`✅ Test post successful: ${result.data.id}`);

    return NextResponse.json({
      success: true,
      tweetId: result.data.id,
      content: result.data.text,
      message: 'Test post successful!'
    });

  } catch (error: any) {
    console.error('❌ Test post failed:', error);
    
    // Return detailed error information for debugging
    return NextResponse.json({
      error: 'Test post failed',
      details: error.message,
      rateLimited: error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit'),
      needsReconnection: error.message?.includes('authentication failed'),
    }, { status: 500 });
  }
}