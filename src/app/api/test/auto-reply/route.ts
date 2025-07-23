import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/test/auto-reply - Test auto-reply generation for latest tweets
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        targetUsers: {
          where: { isActive: true },
          include: {
            tweets: {
              orderBy: { publishedAt: 'desc' },
              take: 5,
              where: {
                // Only tweets from last 24 hours that haven't been replied to
                publishedAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                },
                NOT: {
                  replies: {
                    some: {
                      status: { in: ['sent', 'pending'] }
                    }
                  }
                }
              }
            }
          }
        },
        replyDumps: {
          where: { isActive: true }
        },
        xAccounts: {
          where: { isActive: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.xAccounts.length) {
      return NextResponse.json({ error: 'No active X accounts found' }, { status: 400 });
    }

    // Get all recent tweets from target users
    const allTweets = user.targetUsers.flatMap(target => 
      target.tweets.map(tweet => ({
        ...tweet,
        targetUsername: target.targetUsername
      }))
    );

    if (allTweets.length === 0) {
      return NextResponse.json({ 
        message: 'No recent tweets found',
        details: {
          targetUsers: user.targetUsers.length,
          replyDumps: user.replyDumps.length,
          xAccounts: user.xAccounts.length
        }
      });
    }

    console.log(`Found ${allTweets.length} recent tweets for auto-reply test`);

    const results = [];

    // Test auto-reply generation for up to 3 tweets
    for (const tweet of allTweets.slice(0, 3)) {
      try {
        // Call auto-generate API
        const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/replies/auto-generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN || 'internal'}`
          },
          body: JSON.stringify({
            tweetId: tweet.id,
            useReplyDumps: true,
            forceGenerate: true
          })
        });

        if (response.ok) {
          const data = await response.json();
          results.push({
            tweetId: tweet.tweetId,
            content: tweet.content.substring(0, 100) + '...',
            targetUsername: tweet.targetUsername,
            success: true,
            reply: data.reply,
            usedReplyDump: !!data.reply?.usedReplyDump
          });
        } else {
          const errorData = await response.json();
          results.push({
            tweetId: tweet.tweetId,
            content: tweet.content.substring(0, 100) + '...',
            targetUsername: tweet.targetUsername,
            success: false,
            error: errorData.error || 'Unknown error'
          });
        }
      } catch (error) {
        results.push({
          tweetId: tweet.tweetId,
          content: tweet.content.substring(0, 100) + '...',
          targetUsername: tweet.targetUsername,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return NextResponse.json({
      message: 'Auto-reply test completed',
      stats: {
        totalTweets: allTweets.length,
        testedTweets: results.length,
        successfulReplies: results.filter(r => r.success).length,
        replyDumpsUsed: results.filter(r => r.success && r.usedReplyDump).length,
        targetUsers: user.targetUsers.length,
        replyDumps: user.replyDumps.length
      },
      results
    });

  } catch (error) {
    console.error('Error in auto-reply test:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}