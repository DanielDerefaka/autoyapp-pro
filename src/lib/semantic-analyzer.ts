import { EnhancedTweetAnalysis, SentimentAnalysis, EngagementPrediction, ThreadContext } from '@/types/enhanced-analysis';
import { entityRecognition } from './entity-recognition';
import { dynamicContentFetcher } from './dynamic-content-fetcher';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class SemanticAnalyzer {
  
  /**
   * Perform comprehensive semantic analysis of a tweet
   */
  async analyzeTweet(
    tweetContent: string, 
    authorUsername: string,
    tweetId?: string,
    replyToTweetId?: string
  ): Promise<EnhancedTweetAnalysis> {
    
    // Extract entities and mentioned projects
    const entities = await entityRecognition.extractEntities(tweetContent);
    const mentionedProjects = await entityRecognition.identifyMentionedProjects(entities);
    
    // Fetch context for mentioned projects
    const projectsWithContext = await dynamicContentFetcher.fetchProjectContext(mentionedProjects);
    
    // Analyze sentiment and emotions
    const sentiment = await this.analyzeSentiment(tweetContent);
    
    // Extract semantic meaning and topics
    const semanticAnalysis = await this.extractSemanticMeaning(tweetContent, projectsWithContext);
    
    // Analyze thread context if it's a reply
    let threadContext: ThreadContext | null = null;
    if (replyToTweetId) {
      threadContext = await this.analyzeThreadContext(tweetContent, authorUsername, replyToTweetId);
    }
    
    // Get temporal/trending context
    const temporalContext = await dynamicContentFetcher.getTrendingContext();
    
    // Calculate engagement prediction
    const engagement = await this.predictEngagement(tweetContent, sentiment, entities);
    
    // Calculate reply opportunity score
    const replyOpportunityScore = this.calculateReplyOpportunityScore(
      sentiment,
      entities,
      projectsWithContext,
      engagement,
      threadContext
    );
    
    return {
      semanticMeaning: semanticAnalysis.meaning,
      mentionedProjects: projectsWithContext,
      conversationThread: threadContext,
      temporalRelevance: {
        trendingTopics: temporalContext.trendingTopics,
        marketSentiment: temporalContext.marketSentiment,
        viralPotential: engagement.viralPotential,
        timingScore: this.calculateTimingScore(),
        relevantEvents: await this.getRelevantEvents(semanticAnalysis.topics),
      },
      replyOpportunityScore,
      entities,
      sentiment,
      topics: semanticAnalysis.topics,
      engagement,
    };
  }
  
  /**
   * Analyze sentiment and emotions in tweet
   */
  private async analyzeSentiment(content: string): Promise<SentimentAnalysis> {
    try {
      const prompt = `
Analyze the sentiment and emotions in this tweet:

"${content}"

Return JSON with:
{
  "overall": -1.0 to 1.0 (negative to positive),
  "confidence": 0.0 to 1.0,
  "emotions": {
    "joy": 0.0-1.0,
    "anger": 0.0-1.0,
    "fear": 0.0-1.0,
    "sadness": 0.0-1.0,
    "surprise": 0.0-1.0,
    "disgust": 0.0-1.0
  },
  "subjectivity": 0.0-1.0 (objective to subjective),
  "marketSentiment": "bullish|bearish|neutral",
  "urgency": 0.0-1.0,
  "controversy": 0.0-1.0
}
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 300,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        overall: Math.max(-1, Math.min(1, analysis.overall || 0)),
        confidence: Math.max(0, Math.min(1, analysis.confidence || 0.5)),
        emotions: {
          joy: Math.max(0, Math.min(1, analysis.emotions?.joy || 0)),
          anger: Math.max(0, Math.min(1, analysis.emotions?.anger || 0)),
          fear: Math.max(0, Math.min(1, analysis.emotions?.fear || 0)),
          sadness: Math.max(0, Math.min(1, analysis.emotions?.sadness || 0)),
          surprise: Math.max(0, Math.min(1, analysis.emotions?.surprise || 0)),
          disgust: Math.max(0, Math.min(1, analysis.emotions?.disgust || 0)),
        },
        subjectivity: Math.max(0, Math.min(1, analysis.subjectivity || 0.5)),
        marketSentiment: analysis.marketSentiment || 'neutral',
        urgency: Math.max(0, Math.min(1, analysis.urgency || 0)),
        controversy: Math.max(0, Math.min(1, analysis.controversy || 0)),
      } as SentimentAnalysis & { marketSentiment: string; urgency: number; controversy: number };
      
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        overall: 0,
        confidence: 0.5,
        emotions: {
          joy: 0, anger: 0, fear: 0, sadness: 0, surprise: 0, disgust: 0
        },
        subjectivity: 0.5,
      };
    }
  }
  
  /**
   * Extract semantic meaning and topics
   */
  private async extractSemanticMeaning(content: string, projects: any[]): Promise<{meaning: string, topics: string[]}> {
    try {
      const projectContext = projects.map(p => `${p.projectName}: ${p.latestTweet?.content || 'No recent tweet'}`).join('\n');
      
      const prompt = `
Analyze this tweet's semantic meaning and extract key topics:

Tweet: "${content}"

Context about mentioned projects:
${projectContext}

Return JSON:
{
  "meaning": "concise semantic meaning and intent",
  "topics": ["topic1", "topic2", "topic3"],
  "intent": "share_opinion|ask_question|share_news|promote|complain|celebrate|educate",
  "complexity": 0.0-1.0,
  "technicalLevel": 0.0-1.0,
  "actionable": true/false,
  "keyEntities": ["entity1", "entity2"],
  "implications": ["implication1", "implication2"]
}

Focus on:
- What is the person trying to communicate?
- What topics are they discussing?
- Is this technical or general audience?
- Are they sharing news, opinion, or asking for help?
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        meaning: analysis.meaning || 'General discussion',
        topics: analysis.topics || ['general'],
        intent: analysis.intent || 'share_opinion',
        complexity: analysis.complexity || 0.5,
        technicalLevel: analysis.technicalLevel || 0.5,
        actionable: analysis.actionable || false,
        keyEntities: analysis.keyEntities || [],
        implications: analysis.implications || [],
      } as any;
      
    } catch (error) {
      console.error('Error extracting semantic meaning:', error);
      return {
        meaning: 'General discussion',
        topics: ['general']
      };
    }
  }
  
  /**
   * Analyze thread context for replies
   */
  private async analyzeThreadContext(
    content: string, 
    authorUsername: string, 
    replyToTweetId: string
  ): Promise<ThreadContext> {
    try {
      // This would fetch the original tweet being replied to
      // For now, we'll analyze based on reply patterns
      
      const isDirectReply = content.startsWith('@');
      const mentionedUsers = (content.match(/@(\w+)/g) || []).map(m => m.replace('@', ''));
      
      return {
        isReply: true,
        replyToUsername: mentionedUsers[0] || 'unknown',
        replyToTweetId,
        threadDepth: this.estimateThreadDepth(content),
        conversationTopic: await this.inferConversationTopic(content),
        participants: mentionedUsers,
        threadSentiment: 'neutral', // Would be enhanced with full thread analysis
      };
    } catch (error) {
      console.error('Error analyzing thread context:', error);
      return {
        isReply: true,
        threadDepth: 1,
        conversationTopic: 'discussion',
        participants: [],
        threadSentiment: 'neutral',
      };
    }
  }
  
  /**
   * Predict engagement potential
   */
  private async predictEngagement(
    content: string, 
    sentiment: SentimentAnalysis, 
    entities: any[]
  ): Promise<EngagementPrediction> {
    try {
      const prompt = `
Predict engagement potential for this tweet:

Content: "${content}"
Sentiment: ${sentiment.overall}
Entities: ${entities.length}

Consider:
- Content quality and uniqueness
- Controversial vs safe topics
- Question vs statement format
- Technical vs accessible language
- Timing and relevance

Return JSON:
{
  "likesPrediction": estimated_likes,
  "replyPrediction": estimated_replies,
  "retweetPrediction": estimated_retweets,
  "viralPotential": 0.0-1.0,
  "optimalReplyTiming": "immediate|1hour|3hours|6hours|12hours",
  "confidenceScore": 0.0-1.0,
  "engagementFactors": ["factor1", "factor2"]
}
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 300,
      });

      const prediction = JSON.parse(response.choices[0].message.content || '{}');
      
      const timingMap = {
        'immediate': new Date(),
        '1hour': new Date(Date.now() + 60 * 60 * 1000),
        '3hours': new Date(Date.now() + 3 * 60 * 60 * 1000),
        '6hours': new Date(Date.now() + 6 * 60 * 60 * 1000),
        '12hours': new Date(Date.now() + 12 * 60 * 60 * 1000),
      };
      
      return {
        likesPrediction: Math.max(0, prediction.likesPrediction || 5),
        replyPrediction: Math.max(0, prediction.replyPrediction || 2),
        retweetPrediction: Math.max(0, prediction.retweetPrediction || 1),
        viralPotential: Math.max(0, Math.min(1, prediction.viralPotential || 0.3)),
        optimalReplyTiming: timingMap[prediction.optimalReplyTiming as keyof typeof timingMap] || new Date(),
        confidenceScore: Math.max(0, Math.min(1, prediction.confidenceScore || 0.5)),
        engagementFactors: prediction.engagementFactors || [],
      } as EngagementPrediction & { engagementFactors: string[] };
      
    } catch (error) {
      console.error('Error predicting engagement:', error);
      return {
        likesPrediction: 5,
        replyPrediction: 2,
        retweetPrediction: 1,
        viralPotential: 0.3,
        optimalReplyTiming: new Date(),
        confidenceScore: 0.5,
      };
    }
  }
  
  /**
   * Calculate reply opportunity score
   */
  private calculateReplyOpportunityScore(
    sentiment: SentimentAnalysis,
    entities: any[],
    projects: any[],
    engagement: EngagementPrediction,
    threadContext: ThreadContext | null
  ): number {
    let score = 0;
    
    // Base score from engagement potential
    score += engagement.viralPotential * 0.3;
    
    // Boost for mentioned projects (more context = better replies)
    score += Math.min(projects.length * 0.2, 0.4);
    
    // Boost for entities (more to talk about)
    score += Math.min(entities.length * 0.05, 0.2);
    
    // Sentiment-based scoring
    if (Math.abs(sentiment.overall) > 0.5) {
      score += 0.2; // Strong emotions are good for engagement
    }
    
    // Thread context boost
    if (threadContext && !threadContext.isReply) {
      score += 0.1; // Original tweets are better for replies
    }
    
    // Controversy can be good for engagement (but risky)
    if ((sentiment as any).controversy > 0.7) {
      score += 0.1;
    }
    
    // Urgency boost
    if ((sentiment as any).urgency > 0.6) {
      score += 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Estimate thread depth from content patterns
   */
  private estimateThreadDepth(content: string): number {
    const mentionsCount = (content.match(/@\w+/g) || []).length;
    if (mentionsCount === 0) return 1;
    if (mentionsCount === 1) return 2;
    return Math.min(mentionsCount + 1, 5);
  }
  
  /**
   * Infer conversation topic from reply content
   */
  private async inferConversationTopic(content: string): Promise<string> {
    try {
      const prompt = `
What is the main topic of this conversation based on this reply:

"${content}"

Return just the topic in 1-3 words (e.g., "DeFi discussion", "Technical support", "Price speculation", "Product feedback")
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 50,
      });

      return response.choices[0].message.content?.trim() || 'general discussion';
    } catch (error) {
      return 'general discussion';
    }
  }
  
  /**
   * Calculate timing score based on current time
   */
  private calculateTimingScore(): number {
    const now = new Date();
    const hour = now.getHours();
    
    // Peak engagement hours (9-11 AM, 1-3 PM, 7-9 PM)
    if ((hour >= 9 && hour <= 11) || (hour >= 13 && hour <= 15) || (hour >= 19 && hour <= 21)) {
      return 0.9;
    }
    
    // Good hours
    if (hour >= 8 && hour <= 22) {
      return 0.7;
    }
    
    // Off-peak hours
    return 0.3;
  }
  
  /**
   * Get relevant events based on topics
   */
  private async getRelevantEvents(topics: string[]): Promise<string[]> {
    // This would integrate with news APIs or event tracking
    // For now, return empty array
    return [];
  }
  
  /**
   * Batch analyze multiple tweets efficiently
   */
  async batchAnalyzeTweets(tweets: Array<{content: string, author: string, id?: string}>): Promise<EnhancedTweetAnalysis[]> {
    const analyses = [];
    const batchSize = 3; // Process in small batches to avoid rate limits
    
    for (let i = 0; i < tweets.length; i += batchSize) {
      const batch = tweets.slice(i, i + batchSize);
      const batchPromises = batch.map(tweet => 
        this.analyzeTweet(tweet.content, tweet.author, tweet.id)
      );
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            analyses.push(result.value);
          }
        });
      } catch (error) {
        console.error('Error in batch analysis:', error);
      }
      
      // Add delay between batches
      if (i + batchSize < tweets.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return analyses;
  }
}

export const semanticAnalyzer = new SemanticAnalyzer();