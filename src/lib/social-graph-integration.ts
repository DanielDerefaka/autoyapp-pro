import { SocialGraphAnalyzer } from './social-graph-analyzer';
import { EnhancedReplyGenerator } from './enhanced-reply-generator';
import { EntityRecognitionEngine } from './entity-recognition';
import { SemanticAnalyzer } from './semantic-analyzer';
import { EngagementOpportunity } from '@/types/social-graph';
import { ContextualReplyRequest, SmartReplyResult } from '@/types/enhanced-analysis';
import { ErrorLogger } from './error-logger';

/**
 * Integrates social graph analysis with the enhanced reply generation system
 * to provide socially-aware, contextual replies
 */
export class SocialGraphIntegration {
  private socialGraphAnalyzer: SocialGraphAnalyzer;
  private replyGenerator: EnhancedReplyGenerator;
  private entityEngine: EntityRecognitionEngine;
  private semanticAnalyzer: SemanticAnalyzer;

  constructor(userId: string) {
    this.socialGraphAnalyzer = new SocialGraphAnalyzer(userId);
    this.replyGenerator = new EnhancedReplyGenerator();
    this.entityEngine = new EntityRecognitionEngine();
    this.semanticAnalyzer = new SemanticAnalyzer();
  }

  /**
   * Enhanced reply generation with social graph context
   */
  async generateSociallyAwareReply(request: ContextualReplyRequest): Promise<SmartReplyResult & {
    socialContext: {
      authorInfluence: number;
      relationshipType?: string;
      communityContext?: string;
      bridgeOpportunity?: boolean;
      optimalTiming?: string;
    };
  }> {
    try {
      // 1. Get basic enhanced reply
      const baseReply = await this.replyGenerator.generateSmartReply(request);

      // 2. Analyze social context
      const socialContext = await this.analyzeSocialContext(
        request.targetTweet.authorUsername,
        request.targetTweet.content
      );

      // 3. Get engagement opportunities
      const opportunities = await this.getEngagementOpportunities(
        request.targetTweet.authorUsername
      );

      // 4. Enhance reply with social insights
      const enhancedReply = await this.enhanceReplyWithSocialContext(
        baseReply,
        socialContext,
        opportunities
      );

      return {
        ...enhancedReply,
        socialContext: {
          authorInfluence: socialContext.influenceScore,
          relationshipType: socialContext.relationshipType,
          communityContext: socialContext.communityName,
          bridgeOpportunity: socialContext.isBridgeNode,
          optimalTiming: socialContext.optimalTiming,
        },
      };

    } catch (error) {
      await ErrorLogger.logSystemError({
        error: error as Error,
        metadata: { 
          request, 
          component: 'SocialGraphIntegration',
          method: 'generateSociallyAwareReply'
        },
      });
      
      // Fallback to basic enhanced reply
      return {
        ...(await this.replyGenerator.generateSmartReply(request)),
        socialContext: {
          authorInfluence: 0.5,
        },
      };
    }
  }

  /**
   * Analyze social context for a user and tweet
   */
  private async analyzeSocialContext(authorUsername: string, tweetContent: string) {
    const [author, relationships, communities] = await Promise.all([
      this.getSocialNodeInfo(authorUsername),
      this.getRelationshipContext(authorUsername),
      this.getCommunityContext(authorUsername),
    ]);

    // Analyze tweet entities and mentions
    const entities = await this.entityEngine.extractEntities(tweetContent);
    const mentionedUsers = entities
      .filter(e => e.type === 'user_mention')
      .map(e => e.value.replace('@', ''));

    // Check if this is a bridge opportunity
    const isBridgeNode = await this.checkBridgeOpportunity(authorUsername, mentionedUsers);

    return {
      influenceScore: author?.influenceScore || 0.5,
      followerCount: author?.followerCount || 0,
      relationshipType: relationships.directRelation?.relationType,
      relationshipStrength: relationships.directRelation?.strength || 0,
      communityName: communities.primaryCommunity?.name,
      communityTopics: communities.primaryCommunity?.topics || [],
      isBridgeNode,
      optimalTiming: this.calculateOptimalTiming(author),
      mutualConnections: relationships.mutualConnections || [],
    };
  }

  /**
   * Get social node information for a user
   */
  private async getSocialNodeInfo(username: string) {
    // This would query the social graph database
    // For now, return mock data structure
    return {
      username,
      influenceScore: Math.random() * 0.8 + 0.2, // 0.2 - 1.0
      followerCount: Math.floor(Math.random() * 10000),
      engagementRate: Math.random() * 0.1,
      topicAffinity: {
        'crypto': Math.random(),
        'ai': Math.random(),
        'tech': Math.random(),
      },
    };
  }

  /**
   * Get relationship context between current user and target
   */
  private async getRelationshipContext(targetUsername: string) {
    // This would analyze the relationship strength and type
    return {
      directRelation: {
        relationType: 'mentions' as const,
        strength: Math.random(),
        frequency: Math.floor(Math.random() * 10),
        lastInteraction: new Date(),
      },
      mutualConnections: [
        'elonmusk', 'balajis', 'naval'
      ].slice(0, Math.floor(Math.random() * 3)),
      pathLength: Math.floor(Math.random() * 3) + 1, // 1-3 degrees
    };
  }

  /**
   * Get community context for a user
   */
  private async getCommunityContext(username: string) {
    return {
      primaryCommunity: {
        name: 'Crypto Twitter',
        topics: ['bitcoin', 'ethereum', 'defi'],
        centrality: Math.random(),
        size: Math.floor(Math.random() * 1000) + 100,
      },
      secondaryCommunities: [
        {
          name: 'AI Twitter',
          topics: ['artificial intelligence', 'machine learning'],
          centrality: Math.random() * 0.5,
        }
      ],
    };
  }

  /**
   * Check if engaging with this user creates a bridge opportunity
   */
  private async checkBridgeOpportunity(authorUsername: string, mentionedUsers: string[]) {
    // Logic to determine if this user connects multiple communities
    // or if mentioned users are from different communities
    return mentionedUsers.length >= 2 && Math.random() > 0.7;
  }

  /**
   * Calculate optimal timing for engagement
   */
  private calculateOptimalTiming(author: any) {
    // Analyze when the author is most active and likely to respond
    const hour = new Date().getHours();
    
    if (hour >= 9 && hour <= 17) {
      return 'business_hours';
    } else if (hour >= 18 && hour <= 22) {
      return 'evening_peak';
    } else {
      return 'off_peak';
    }
  }

  /**
   * Get engagement opportunities for a specific user
   */
  private async getEngagementOpportunities(targetUsername: string): Promise<EngagementOpportunity[]> {
    // This would query the social graph for opportunities
    return [
      {
        targetNodeId: 'mock-id',
        targetUsername,
        opportunityType: 'direct_reply',
        description: `High-engagement opportunity with ${targetUsername}`,
        potentialReach: Math.floor(Math.random() * 10000),
        confidenceScore: Math.random() * 0.4 + 0.6, // 0.6 - 1.0
        context: {
          recentTopics: ['crypto', 'ai', 'tech'],
          mutualConnections: ['elonmusk', 'balajis'],
        },
      }
    ];
  }

  /**
   * Enhance the base reply with social context
   */
  private async enhanceReplyWithSocialContext(
    baseReply: SmartReplyResult,
    socialContext: any,
    opportunities: EngagementOpportunity[]
  ): Promise<SmartReplyResult> {
    let enhancedContent = baseReply.generatedReply;
    let enhancedReasoning = baseReply.analysisReasoning;

    // Adjust tone based on influence and relationship
    if (socialContext.influenceScore > 0.8) {
      enhancedReasoning += " Enhanced for high-influence target with respectful, value-adding tone.";
      
      // Make the reply more thoughtful and substantial for influential users
      if (baseReply.generatedReply.length < 100) {
        enhancedContent = await this.expandReplyForInfluencer(enhancedContent, socialContext);
      }
    }

    // Add community context
    if (socialContext.communityName && socialContext.communityTopics.length > 0) {
      enhancedReasoning += ` Contextualized for ${socialContext.communityName} community.`;
    }

    // Leverage bridge opportunities
    if (socialContext.isBridgeNode) {
      enhancedReasoning += " Identified as bridge connection opportunity for network expansion.";
    }

    // Adjust timing recommendation
    if (socialContext.optimalTiming === 'off_peak') {
      enhancedReasoning += " Recommended to delay for optimal engagement timing.";
    }

    return {
      ...baseReply,
      generatedReply: enhancedContent,
      analysisReasoning: enhancedReasoning,
      confidenceScore: Math.min(baseReply.confidenceScore * 1.1, 1.0), // Slight boost for social context
      metadata: {
        ...baseReply.metadata,
        socialEnhanced: true,
        socialContext: {
          influence: socialContext.influenceScore,
          community: socialContext.communityName,
          timing: socialContext.optimalTiming,
        },
      },
    };
  }

  /**
   * Expand reply content for high-influence targets
   */
  private async expandReplyForInfluencer(content: string, socialContext: any): Promise<string> {
    // Add more substance and thoughtfulness for influential users
    const topics = socialContext.communityTopics || [];
    
    if (topics.includes('crypto') && content.length < 120) {
      // Add crypto context if relevant
      return content + " The market dynamics here are particularly interesting given the current macro environment.";
    }
    
    if (topics.includes('ai') && content.length < 120) {
      // Add AI context if relevant
      return content + " This aligns with the broader trends we're seeing in AI development.";
    }
    
    return content;
  }

  /**
   * Record social interaction for graph learning
   */
  async recordInteractionForLearning(data: {
    sourceUsername: string;
    targetUsername: string;
    interactionType: 'like' | 'reply' | 'retweet' | 'quote' | 'mention';
    tweetId: string;
    content: string;
    sentiment?: number;
  }) {
    try {
      await this.socialGraphAnalyzer.recordInteraction({
        sourceUsername: data.sourceUsername,
        targetUsername: data.targetUsername,
        interactionType: data.interactionType,
        tweetId: data.tweetId,
        content: data.content,
        sentimentScore: data.sentiment,
        timestamp: new Date(),
      });

      // Also update social nodes if they don't exist
      await this.socialGraphAnalyzer.createOrUpdateNode({
        username: data.targetUsername,
        followerCount: 0, // Would be fetched from Twitter API
        followingCount: 0,
        tweetCount: 0,
        isVerified: false,
      });

    } catch (error) {
      await ErrorLogger.logSystemError({
        error: error as Error,
        metadata: { 
          data, 
          component: 'SocialGraphIntegration',
          method: 'recordInteractionForLearning'
        },
      });
    }
  }

  /**
   * Get social recommendations for target user selection
   */
  async getTargetRecommendations(currentTargets: string[], limit: number = 10) {
    try {
      const opportunities = await this.socialGraphAnalyzer.analyzeSocialGraph({
        userId: 'current-user-id', // Would be passed from context
        targetUsernames: currentTargets,
        analysisType: 'influence',
        maxDepth: 2,
      });

      return opportunities.opportunities
        .filter(opp => !currentTargets.includes(opp.targetUsername))
        .slice(0, limit)
        .map(opp => ({
          username: opp.targetUsername,
          reason: opp.description,
          potentialReach: opp.potentialReach,
          confidence: opp.confidenceScore,
          type: opp.opportunityType,
        }));

    } catch (error) {
      await ErrorLogger.logSystemError({
        error: error as Error,
        metadata: { 
          currentTargets, 
          limit,
          component: 'SocialGraphIntegration',
          method: 'getTargetRecommendations'
        },
      });
      return [];
    }
  }
}