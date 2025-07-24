import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { SocialGraphAnalyzer } from '@/lib/social-graph-analyzer';
import { ErrorLogger } from '@/lib/error-logger';

// POST /api/social-graph/seed - Seed social graph with target users and sample data
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

    const analyzer = new SocialGraphAnalyzer(user.id);

    // Get user's target users to seed the graph
    const targetUsers = await prisma.targetUser.findMany({
      where: { userId: user.id, isActive: true },
      take: 20, // Limit to first 20 for seeding
    });

    // If no target users, create sample data with crypto influencers
    let usersToSeed = targetUsers;
    
    if (targetUsers.length === 0) {
      // Create sample target users for demo purposes
      const sampleUsers = [
        'elonmusk', 'balajis', 'naval', 'VitalikButerin', 'aantonop',
        'jack', 'satoshi_nakabot', 'DocumentingBTC', 'BitcoinMagazine',
        'OpenAI', 'GoogleAI', 'DeepMind', 'AnthropicAI'
      ];
      
      usersToSeed = sampleUsers.map(username => ({
        id: `sample-${username}`,
        userId: user.id,
        xAccountId: 'sample-account',
        targetUsername: username,
        targetUserId: null,
        isActive: true,
        lastScraped: null,
        engagementScore: 0,
        notes: `Sample user for demo`,
        createdAt: new Date(),
      }));
    }

    const createdNodes = [];
    const createdInteractions = [];

    // Create social nodes for target users with sample data
    for (const target of usersToSeed) {
      const node = await analyzer.createOrUpdateNode({
        username: target.targetUsername,
        displayName: target.targetUsername.charAt(0).toUpperCase() + target.targetUsername.slice(1),
        followerCount: Math.floor(Math.random() * 50000) + 1000, // Random 1K-50K followers
        followingCount: Math.floor(Math.random() * 2000) + 100,
        tweetCount: Math.floor(Math.random() * 10000) + 500,
        isVerified: Math.random() > 0.8, // 20% chance of being verified
        bio: `Sample bio for ${target.targetUsername}`,
        location: ['San Francisco', 'New York', 'London', 'Remote'][Math.floor(Math.random() * 4)],
      });
      createdNodes.push(node);
    }

    // Create sample interactions between nodes
    const sampleInteractions = [
      { type: 'reply', weight: 0.8 },
      { type: 'mention', weight: 0.6 },
      { type: 'retweet', weight: 0.4 },
      { type: 'like', weight: 0.2 },
    ];

    for (let i = 0; i < usersToSeed.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 4, usersToSeed.length); j++) {
        const interaction = sampleInteractions[Math.floor(Math.random() * sampleInteractions.length)];
        
        try {
          await analyzer.recordInteraction({
            sourceUsername: usersToSeed[i].targetUsername,
            targetUsername: usersToSeed[j].targetUsername,
            interactionType: interaction.type as any,
            tweetId: `sample_tweet_${i}_${j}`,
            content: `Sample ${interaction.type} interaction between users`,
            sentimentScore: (Math.random() - 0.5) * 2, // Random sentiment -1 to 1
            timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random time in last 30 days
          });
          createdInteractions.push({
            from: usersToSeed[i].targetUsername,
            to: usersToSeed[j].targetUsername,
            type: interaction.type
          });
        } catch (error) {
          console.warn(`Failed to create interaction: ${error}`);
        }
      }
    }

    // Create some additional high-influence nodes (crypto influencers)
    const influencers = [
      { username: 'elonmusk', followers: 150000000, verified: true },
      { username: 'balajis', followers: 2000000, verified: true },
      { username: 'naval', followers: 5000000, verified: true },
      { username: 'VitalikButerin', followers: 4000000, verified: true },
      { username: 'aantonop', followers: 800000, verified: false },
    ];

    const influencerNodes = [];
    for (const inf of influencers) {
      try {
        const node = await analyzer.createOrUpdateNode({
          username: inf.username,
          displayName: inf.username,
          followerCount: inf.followers,
          followingCount: Math.floor(inf.followers * 0.001), // Following ratio
          tweetCount: Math.floor(Math.random() * 20000) + 5000,
          isVerified: inf.verified,
          bio: `${inf.username} - Crypto/Tech influencer`,
          location: 'Global',
        });
        influencerNodes.push(node);
      } catch (error) {
        console.warn(`Failed to create influencer node: ${error}`);
      }
    }

    // Create some interactions between target users and influencers
    for (let i = 0; i < Math.min(usersToSeed.length, 5); i++) {
      for (let j = 0; j < Math.min(influencers.length, 2); j++) {
        try {
          await analyzer.recordInteraction({
            sourceUsername: usersToSeed[i].targetUsername,
            targetUsername: influencers[j].username,
            interactionType: 'mention',
            tweetId: `influencer_interaction_${i}_${j}`,
            content: `Mentioning ${influencers[j].username} in a tweet`,
            sentimentScore: 0.7, // Positive sentiment towards influencers
            timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
          });
        } catch (error) {
          console.warn(`Failed to create influencer interaction: ${error}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        nodesCreated: createdNodes.length + influencerNodes.length,
        interactionsCreated: createdInteractions.length,
        targetUsersSeeded: usersToSeed.length,
        influencersAdded: influencerNodes.length,
      },
      message: 'Social graph seeded successfully! You can now run analysis.',
    });

  } catch (error) {
    await ErrorLogger.logApiError({
      error: error as Error,
      request,
      endpoint: '/api/social-graph/seed',
      method: 'POST',
    });

    console.error('Error seeding social graph:', error);
    return NextResponse.json(
      { error: 'Failed to seed social graph' },
      { status: 500 }
    );
  }
}