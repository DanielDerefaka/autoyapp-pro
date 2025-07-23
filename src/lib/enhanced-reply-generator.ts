import { 
  EnhancedTweetAnalysis, 
  SmartReplyResult, 
  EnhancedReplyStrategy,
  ReplyDumpContext,
  UserStyleContext,
  ContextualReplyRequest
} from '@/types/enhanced-analysis';
import { semanticAnalyzer } from './semantic-analyzer';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class EnhancedReplyGenerator {
  
  /**
   * Generate contextually intelligent reply using all available intelligence
   */
  async generateSmartReply(request: ContextualReplyRequest): Promise<SmartReplyResult> {
    const { analysis, availableReplyDumps, userStyle, isVerified } = request;
    
    // Determine the best reply strategy
    const strategy = await this.determineReplyStrategy(analysis);
    
    // Find the most relevant reply dump if any
    const relevantDump = await this.findMostRelevantDump(
      analysis, 
      availableReplyDumps, 
      strategy
    );
    
    // Generate the reply content
    const replyContent = await this.generateContextualReply(
      analysis,
      strategy,
      relevantDump,
      userStyle,
      isVerified
    );
    
    // Calculate optimal timing
    const optimalTiming = this.calculateOptimalTiming(analysis);
    
    return {
      content: replyContent,
      strategy,
      usedReplyDump: relevantDump ? {
        id: relevantDump.id,
        originalContent: relevantDump.content,
        adaptationLevel: relevantDump.contextRelevance || 0.5,
      } : undefined,
      confidence: this.calculateReplyConfidence(analysis, strategy, relevantDump),
      reasoning: this.generateReasoning(analysis, strategy, relevantDump),
      timing: {
        optimal: optimalTiming,
        reasoning: this.getTimingReasoning(analysis),
      },
    };
  }
  
  /**
   * Determine the best reply strategy based on tweet analysis
   */
  private async determineReplyStrategy(analysis: EnhancedTweetAnalysis): Promise<EnhancedReplyStrategy> {
    try {
      const projectContext = analysis.mentionedProjects.map(p => 
        `${p.projectName}: ${p.latestTweet?.content || 'No recent tweet'}`
      ).join('\n');
      
      const prompt = `
Analyze this tweet and determine the best reply strategy:

Tweet Analysis:
- Content: "${analysis.semanticMeaning}"
- Sentiment: ${analysis.sentiment.overall}
- Topics: ${analysis.topics.join(', ')}
- Mentioned Projects: ${analysis.mentionedProjects.map(p => p.projectName).join(', ')}
- Reply Opportunity Score: ${analysis.replyOpportunityScore}

Project Context:
${projectContext}

Thread Context: ${analysis.conversationThread ? 'Reply to conversation' : 'Original tweet'}

Determine the best strategy and return JSON:
{
  "strategy": "project_context|thread_continuation|value_add|opinion_share|question_ask",
  "confidence": 0.0-1.0,
  "reasoning": "why this strategy is best",
  "suggestedTone": "professional|casual|witty|supportive|analytical",
  "keyPoints": ["point1", "point2", "point3"],
  "approach": "agree|disagree|expand|question|educate|relate"
}

Strategy definitions:
- project_context: Reply relates to mentioned projects and their latest activities
- thread_continuation: Continue an existing conversation thread naturally
- value_add: Provide additional value, insights, or information
- opinion_share: Share a relevant opinion or perspective
- question_ask: Ask thoughtful questions to drive engagement
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 400,
      });

      const strategyData = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        strategy: strategyData.strategy || 'value_add',
        confidence: Math.max(0, Math.min(1, strategyData.confidence || 0.5)),
        reasoning: strategyData.reasoning || 'General engagement strategy',
        suggestedTone: strategyData.suggestedTone || 'casual',
        keyPoints: strategyData.keyPoints || [],
        projectContext: analysis.mentionedProjects[0] || undefined,
        threadContext: analysis.conversationThread || undefined,
        approach: strategyData.approach || 'relate',
      } as EnhancedReplyStrategy & { approach: string };
      
    } catch (error) {
      console.error('Error determining reply strategy:', error);
      return {
        strategy: 'value_add',
        confidence: 0.5,
        reasoning: 'Default strategy due to analysis error',
        suggestedTone: 'casual',
        keyPoints: [],
      };
    }
  }
  
  /**
   * Find the most relevant reply dump using semantic similarity
   */
  private async findMostRelevantDump(
    analysis: EnhancedTweetAnalysis,
    availableDumps: ReplyDumpContext[],
    strategy: EnhancedReplyStrategy
  ): Promise<ReplyDumpContext | null> {
    if (availableDumps.length === 0) return null;
    
    try {
      // Score each dump for relevance
      const scoredDumps = await Promise.all(
        availableDumps.map(async (dump) => {
          const similarity = await this.calculateSemanticSimilarity(
            analysis, 
            dump, 
            strategy
          );
          
          return {
            ...dump,
            similarityScore: similarity.semantic,
            contextRelevance: similarity.contextual,
            tonalMatch: similarity.tonal,
            overallScore: (similarity.semantic * 0.4) + (similarity.contextual * 0.4) + (similarity.tonal * 0.2),
          };
        })
      );
      
      // Sort by overall score and return the best match if it's good enough
      scoredDumps.sort((a, b) => b.overallScore - a.overallScore);
      const bestMatch = scoredDumps[0];
      
      // Only use if the match is reasonably good
      if (bestMatch.overallScore > 0.6) {
        return bestMatch;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding relevant dump:', error);
      return null;
    }
  }
  
  /**
   * Calculate semantic similarity between tweet analysis and reply dump
   */
  private async calculateSemanticSimilarity(
    analysis: EnhancedTweetAnalysis,
    dump: ReplyDumpContext,
    strategy: EnhancedReplyStrategy
  ): Promise<{ semantic: number; contextual: number; tonal: number }> {
    try {
      const prompt = `
Calculate similarity between tweet context and reply dump:

Tweet Context:
- Meaning: "${analysis.semanticMeaning}"
- Topics: ${analysis.topics.join(', ')}
- Sentiment: ${analysis.sentiment.overall}
- Strategy: ${strategy.strategy}

Reply Dump:
- Content: "${dump.content}"
- Tags: ${dump.tags.join(', ')}
- Tone: ${dump.tone}

Return JSON with scores 0.0-1.0:
{
  "semantic": "how similar are the topics and meaning",
  "contextual": "how well does the dump fit the tweet context", 
  "tonal": "how well does the dump tone match the needed response tone",
  "explanation": "brief explanation of the match quality"
}
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 200,
      });

      const similarity = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        semantic: Math.max(0, Math.min(1, similarity.semantic || 0)),
        contextual: Math.max(0, Math.min(1, similarity.contextual || 0)),
        tonal: Math.max(0, Math.min(1, similarity.tonal || 0)),
      };
      
    } catch (error) {
      console.error('Error calculating similarity:', error);
      return { semantic: 0, contextual: 0, tonal: 0 };
    }
  }
  
  /**
   * Generate contextual reply content
   */
  private async generateContextualReply(
    analysis: EnhancedTweetAnalysis,
    strategy: EnhancedReplyStrategy,
    relevantDump: ReplyDumpContext | null,
    userStyle: UserStyleContext,
    isVerified: boolean
  ): Promise<string> {
    const maxLength = isVerified ? 2000 : 280;
    
    try {
      // Build comprehensive context
      const projectContext = analysis.mentionedProjects.map(p => 
        `${p.projectName}: ${p.latestTweet?.content || 'No recent activity'}`
      ).join('\n');
      
      const threadContext = analysis.conversationThread ? 
        `This is a reply to @${analysis.conversationThread.replyToUsername} in a ${analysis.conversationThread.conversationTopic} discussion` : 
        'This is an original tweet';
      
      const dumpContext = relevantDump ? 
        `Use this reply template as inspiration (adapt heavily for context): "${relevantDump.content}"` :
        'No relevant template found - create original reply';
      
      const prompt = `
Generate a contextual reply using this comprehensive analysis:

TWEET ANALYSIS:
- Original meaning: "${analysis.semanticMeaning}"
- Topics: ${analysis.topics.join(', ')}
- Sentiment: ${analysis.sentiment.overall} (${(analysis.sentiment as any).marketSentiment})
- Opportunity score: ${analysis.replyOpportunityScore}

STRATEGY: ${strategy.strategy}
- Approach: ${(strategy as any).approach}
- Tone: ${strategy.suggestedTone}
- Key points to address: ${strategy.keyPoints.join(', ')}
- Reasoning: ${strategy.reasoning}

PROJECT CONTEXT:
${projectContext}

THREAD CONTEXT:
${threadContext}

REPLY TEMPLATE GUIDANCE:
${dumpContext}

USER STYLE:
- Preferred tone: ${userStyle.preferredTone}
- Engagement style: ${userStyle.engagementStyle}
- Expertise areas: ${userStyle.topicExpertise.join(', ')}

REQUIREMENTS:
- Maximum ${maxLength} characters
- ${strategy.suggestedTone} tone
- Highly contextual to the specific tweet
- Add genuine value to the conversation
- If using template, adapt it heavily for this specific context
- Include relevant project context if applicable
- Be authentic and engaging
- Don't be overly promotional

Generate the reply:
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: Math.min(500, Math.ceil(maxLength / 2)),
      });

      let reply = response.choices[0].message.content?.trim() || '';
      
      // Ensure character limit
      if (reply.length > maxLength) {
        reply = reply.substring(0, maxLength - 3) + '...';
      }
      
      return reply;
      
    } catch (error) {
      console.error('Error generating contextual reply:', error);
      
      // Fallback to simple reply
      return relevantDump?.content.substring(0, maxLength) || 
             `Interesting perspective! What are your thoughts on this?`;
    }
  }
  
  /**
   * Calculate optimal timing for the reply
   */
  private calculateOptimalTiming(analysis: EnhancedTweetAnalysis): Date {
    const baseDelay = 5 * 60 * 1000; // 5 minutes base delay
    let additionalDelay = 0;
    
    // Add delay based on reply opportunity score (higher score = reply sooner)
    additionalDelay += (1 - analysis.replyOpportunityScore) * 30 * 60 * 1000;
    
    // Add delay for controversial content (let it settle)
    if ((analysis.sentiment as any).controversy > 0.7) {
      additionalDelay += 15 * 60 * 1000;
    }
    
    // Consider optimal engagement timing
    if (analysis.engagement.optimalReplyTiming) {
      const optimalTime = new Date(analysis.engagement.optimalReplyTiming);
      const now = new Date();
      
      if (optimalTime > now) {
        return optimalTime;
      }
    }
    
    // Add randomization for natural behavior
    const randomJitter = Math.random() * 120000; // 0-2 minutes
    
    return new Date(Date.now() + baseDelay + additionalDelay + randomJitter);
  }
  
  /**
   * Calculate confidence in the generated reply
   */
  private calculateReplyConfidence(
    analysis: EnhancedTweetAnalysis,
    strategy: EnhancedReplyStrategy,
    relevantDump: ReplyDumpContext | null
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Boost from strategy confidence
    confidence += strategy.confidence * 0.3;
    
    // Boost from reply opportunity score
    confidence += analysis.replyOpportunityScore * 0.2;
    
    // Boost from having relevant context
    if (analysis.mentionedProjects.length > 0) {
      confidence += 0.2;
    }
    
    // Boost from having a good template match
    if (relevantDump && relevantDump.contextRelevance && relevantDump.contextRelevance > 0.7) {
      confidence += 0.2;
    }
    
    // Reduce confidence for highly controversial content
    if ((analysis.sentiment as any).controversy > 0.8) {
      confidence -= 0.1;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }
  
  /**
   * Generate reasoning for the reply approach
   */
  private generateReasoning(
    analysis: EnhancedTweetAnalysis,
    strategy: EnhancedReplyStrategy,
    relevantDump: ReplyDumpContext | null
  ): string {
    const reasons = [];
    
    reasons.push(`Strategy: ${strategy.reasoning}`);
    
    if (analysis.mentionedProjects.length > 0) {
      reasons.push(`Leveraging context from ${analysis.mentionedProjects.length} mentioned project(s)`);
    }
    
    if (relevantDump) {
      reasons.push(`Adapted from relevant template with ${Math.round((relevantDump.contextRelevance || 0) * 100)}% context match`);
    }
    
    if (analysis.replyOpportunityScore > 0.7) {
      reasons.push('High engagement opportunity detected');
    }
    
    if (analysis.conversationThread) {
      reasons.push('Continuing existing conversation thread');
    }
    
    return reasons.join('. ') + '.';
  }
  
  /**
   * Get timing reasoning
   */
  private getTimingReasoning(analysis: EnhancedTweetAnalysis): string {
    if (analysis.replyOpportunityScore > 0.8) {
      return 'High opportunity - replying quickly for maximum engagement';
    }
    
    if ((analysis.sentiment as any).controversy > 0.7) {
      return 'Controversial topic - adding delay to let discussion develop';
    }
    
    if (analysis.engagement.viralPotential > 0.7) {
      return 'High viral potential - timing for optimal visibility';
    }
    
    return 'Standard timing for natural engagement pattern';
  }
  
  /**
   * Batch generate replies for multiple tweets
   */
  async batchGenerateReplies(requests: ContextualReplyRequest[]): Promise<SmartReplyResult[]> {
    const results = [];
    const batchSize = 2; // Small batch size to avoid rate limits
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.generateSmartReply(request));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          }
        });
      } catch (error) {
        console.error('Error in batch reply generation:', error);
      }
      
      // Add delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }
}

export const enhancedReplyGenerator = new EnhancedReplyGenerator();