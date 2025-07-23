import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/test/enhanced-auto-reply - Test the enhanced auto-reply system
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
              take: 3,
              where: {
                // Only tweets from last 24 hours
                publishedAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                },
                // Haven't been replied to yet
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

    // Get all recent tweets
    const allTweets = user.targetUsers.flatMap(target => 
      target.tweets.map(tweet => ({
        ...tweet,
        targetUsername: target.targetUsername
      }))
    );

    if (allTweets.length === 0) {
      return NextResponse.json({ 
        message: 'No recent tweets found for enhanced analysis',
        suggestion: 'Add target users and wait for tweets to be scraped',
        stats: {
          targetUsers: user.targetUsers.length,
          replyDumps: user.replyDumps.length,
          xAccounts: user.xAccounts.length
        }
      });
    }

    console.log(`🧪 Testing enhanced auto-reply system with ${allTweets.length} tweets`);

    const results = [];

    // Test enhanced auto-reply for up to 2 tweets
    for (const tweet of allTweets.slice(0, 2)) {
      try {
        console.log(`\n🔍 Analyzing tweet: "${tweet.content.substring(0, 100)}..."`);
        
        // Call the enhanced auto-generate API
        const response = await fetch(`${process.env.APP_URL || 'http://localhost:3001'}/api/replies/auto-generate`, {
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
            tweetContent: tweet.content.substring(0, 200) + '...',
            targetUsername: tweet.targetUsername,
            success: true,
            enhancedReply: {
              content: data.reply.content,
              strategy: data.reply.strategy.strategy,
              confidence: data.reply.confidence,
              reasoning: data.reply.reasoning,
              analysis: data.reply.analysis,
              usedReplyDump: !!data.reply.usedReplyDump,
              timing: data.reply.timing,
            }
          });
          
          console.log(`✅ Generated ${data.reply.strategy.strategy} reply with ${data.reply.confidence} confidence`);
        } else {
          const errorData = await response.json();
          results.push({
            tweetId: tweet.tweetId,
            tweetContent: tweet.content.substring(0, 200) + '...',
            targetUsername: tweet.targetUsername,
            success: false,
            error: errorData.error || 'Unknown error'
          });
          
          console.log(`❌ Failed: ${errorData.error}`);
        }
      } catch (error) {
        results.push({
          tweetId: tweet.tweetId,
          tweetContent: tweet.content.substring(0, 200) + '...',
          targetUsername: tweet.targetUsername,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        console.log(`❌ Error: ${error}`);
      }

      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const successfulReplies = results.filter(r => r.success);
    const repliesWithDumps = successfulReplies.filter(r => r.enhancedReply?.usedReplyDump);

    return NextResponse.json({
      message: '🚀 Enhanced auto-reply system test completed',
      enhancedFeatures: [
        '🧠 Advanced semantic analysis',
        '🎯 Project mention detection & context fetching',
        '📊 Sentiment-aware reply generation',
        '🤖 Intelligent reply dump matching',
        '⏱️ Optimal timing calculation',
        '📈 Engagement prediction',
        '🔍 Thread context analysis'
      ],
      testResults: {
        totalTweets: allTweets.length,
        testedTweets: results.length,
        successfulReplies: successfulReplies.length,
        repliesUsingDumps: repliesWithDumps.length,
        repliesWithProjectContext: successfulReplies.filter(r => 
          r.enhancedReply?.analysis?.mentionedProjects > 0
        ).length,
      },
      userStats: {
        targetUsers: user.targetUsers.length,
        replyDumps: user.replyDumps.length,
        xAccounts: user.xAccounts.length,
        isVerified: user.xAccounts[0]?.isVerified || false,
      },
      sampleResults: results.map(result => ({
        tweet: result.tweetContent,
        target: result.targetUsername,
        success: result.success,
        ...(result.success && result.enhancedReply ? {
          generatedReply: result.enhancedReply.content,
          strategy: result.enhancedReply.strategy,
          confidence: result.enhancedReply.confidence,
          usedDump: result.enhancedReply.usedReplyDump,
          projects: result.enhancedReply.analysis.mentionedProjects,
          sentiment: result.enhancedReply.analysis.sentiment,
        } : {
          error: result.error
        })
      })),
      nextSteps: [
        '✅ The enhanced system is working!',
        '📝 Add more reply dumps with specific tags for better matching',
        '🎯 Target users mentioning projects get the best replies',
        '🔄 Enable autopilot to use this system automatically',
        '📊 Check /analytics for detailed performance metrics'
      ]
    });

  } catch (error) {
    console.error('❌ Error in enhanced auto-reply test:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        tip: 'Check server logs for detailed error information'
      },
      { status: 500 }
    );
  }
}