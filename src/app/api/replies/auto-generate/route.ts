import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { semanticAnalyzer } from '@/lib/semantic-analyzer';
import { enhancedReplyGenerator } from '@/lib/enhanced-reply-generator';
import { ReplyDumpContext, UserStyleContext } from '@/types/enhanced-analysis';

const autoGenerateSchema = z.object({
  tweetId: z.string(),
  useReplyDumps: z.boolean().default(true),
  forceGenerate: z.boolean().default(false), // Skip ToS checks for testing
});

// POST /api/replies/auto-generate - Auto-generate reply based on tweet content
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        replyDumps: {
          where: { isActive: true },
        },
        xAccounts: {
          where: { isActive: true },
        },
        autopilotSettings: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { tweetId, useReplyDumps, forceGenerate } = autoGenerateSchema.parse(body);

    // Get tweet details
    const tweet = await prisma.tweet.findUnique({
      where: { id: tweetId },
      include: {
        targetUser: true,
      },
    });

    if (!tweet) {
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 });
    }

    // Check if autopilot is enabled and configured
    if (!forceGenerate && (!user.autopilotSettings?.isEnabled)) {
      return NextResponse.json({ error: 'Autopilot not enabled' }, { status: 400 });
    }

    // Get user's X account (use first active one)
    const xAccount = user.xAccounts[0];
    if (!xAccount) {
      return NextResponse.json({ error: 'No active X account found' }, { status: 400 });
    }

    // Check if we should reply based on autopilot settings
    if (!forceGenerate && user.autopilotSettings) {
      const settings = user.autopilotSettings;
      
      // Check if tweet is too old
      const tweetAge = Date.now() - new Date(tweet.publishedAt).getTime();
      if (tweetAge > settings.maxTweetAge * 60 * 1000) {
        return NextResponse.json({ 
          error: 'Tweet too old',
          reason: `Tweet is ${Math.round(tweetAge / (60 * 1000))} minutes old, max age is ${settings.maxTweetAge} minutes`
        }, { status: 400 });
      }

      // Check if we should skip retweets/replies
      if (settings.skipRetweets && tweet.content.startsWith('RT @')) {
        return NextResponse.json({ error: 'Skipping retweet per settings' }, { status: 400 });
      }
    }

    // 🚀 NEW ENHANCED AI SYSTEM
    console.log('🧠 Using enhanced AI analysis system...');
    
    // Perform comprehensive tweet analysis
    const analysis = await semanticAnalyzer.analyzeTweet(
      tweet.content,
      tweet.authorUsername,
      tweet.id
    );

    console.log(`📊 Analysis complete - Opportunity score: ${analysis.replyOpportunityScore}, Projects: ${analysis.mentionedProjects.length}`);

    // Prepare reply dumps as context
    const replyDumps: ReplyDumpContext[] = user.replyDumps.map(dump => ({
      id: dump.id,
      content: dump.content,
      tags: JSON.parse(dump.tags),
      tone: dump.tone,
    }));

    // Prepare user style context
    const userStyle: UserStyleContext = {
      preferredTone: user.replyStyle ? JSON.parse(user.replyStyle.styles).tone || 'casual' : 'casual',
      vocabularyLevel: 'accessible',
      emojiUsage: 'moderate',
      lengthPreference: xAccount.isVerified ? 'flexible' : 'concise',
      topicExpertise: analysis.topics,
      engagementStyle: 'helpful',
    };

    // Generate intelligent reply using enhanced system
    const smartReply = await enhancedReplyGenerator.generateSmartReply({
      tweetId: tweet.id,
      tweetContent: tweet.content,
      targetUsername: tweet.authorUsername,
      analysis,
      availableReplyDumps: replyDumps,
      userStyle,
      isVerified: xAccount.isVerified,
    });

    console.log(`✨ Smart reply generated with ${smartReply.confidence} confidence using ${smartReply.strategy.strategy} strategy`);

    // Update dump usage if one was used
    if (smartReply.usedReplyDump) {
      await prisma.replyDump.update({
        where: { id: smartReply.usedReplyDump.id },
        data: { usageCount: { increment: 1 } },
      });
    }

    const replyContent = smartReply.content;
    const replyType = smartReply.usedReplyDump ? 'enhanced_dump' : 'enhanced_ai';
    const usedReplyDumpId = smartReply.usedReplyDump?.id || null;

    // Use intelligent timing from enhanced system
    const scheduledFor = smartReply.timing.optimal;

    // Create reply queue entry
    const queuedReply = await prisma.replyQueue.create({
      data: {
        userId: user.id,
        xAccountId: xAccount.id,
        tweetId: tweet.id,
        replyContent,
        replyType,
        replyDumpId: usedReplyDumpId,
        scheduledFor,
        isAutoGenerated: true,
      },
    });

    return NextResponse.json({
      success: true,
      reply: {
        id: queuedReply.id,
        content: replyContent,
        type: replyType,
        scheduledFor: scheduledFor.toISOString(),
        strategy: smartReply.strategy,
        confidence: smartReply.confidence,
        reasoning: smartReply.reasoning,
        analysis: {
          opportunityScore: analysis.replyOpportunityScore,
          mentionedProjects: analysis.mentionedProjects.length,
          topics: analysis.topics,
          sentiment: analysis.sentiment.overall,
        },
        usedReplyDump: smartReply.usedReplyDump || null,
        timing: {
          optimal: scheduledFor.toISOString(),
          reasoning: smartReply.timing.reasoning,
        },
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error auto-generating reply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Old helper functions removed - now using enhanced AI system