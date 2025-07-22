/**
 * Advanced Viral Reply Generation System
 * Uses cutting-edge viral content psychology and AI optimization
 */

import OpenAI from 'openai'
import { prisma } from './prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ViralReplyOptions {
  tweetContent: string
  authorUsername: string
  targetUserId?: string
  userStyles?: any
  context?: {
    authorFollowers?: number
    tweetEngagement?: { likes: number; retweets: number; replies: number }
    authorVerified?: boolean
    tweetAge?: number // hours
    industry?: string
    sentiment?: number
  }
  viralStrategy?: 'curiosity' | 'controversy' | 'value' | 'emotion' | 'authority' | 'social-proof' | 'auto'
}

export interface ViralReply {
  content: string
  viralScore: number
  strategy: string
  hooks: string[]
  psychologyTriggers: string[]
  confidence: number
  reasoning: string
  fallbackUsed: boolean
  optimizedFor: 'likes' | 'replies' | 'retweets' | 'balance'
}

export class ViralReplyGenerator {
  
  /**
   * Generate a viral-optimized reply using advanced AI and psychology
   */
  async generateViralReply(options: ViralReplyOptions): Promise<ViralReply> {
    try {
      // Analyze tweet content for viral potential
      const tweetAnalysis = await this.analyzeTweetForViral(options.tweetContent, options.context)
      
      // Determine optimal viral strategy
      const strategy = options.viralStrategy === 'auto' ? 
        this.selectOptimalStrategy(tweetAnalysis) : 
        options.viralStrategy || 'value'
      
      // Generate primary viral reply
      const primaryReply = await this.generatePrimaryViralReply(options, tweetAnalysis, strategy)
      
      // Validate and optimize the reply
      const optimizedReply = await this.optimizeReplyForViral(primaryReply, tweetAnalysis)
      
      // Calculate viral score
      const viralScore = this.calculateViralScore(optimizedReply, tweetAnalysis)
      
      return {
        content: optimizedReply.content,
        viralScore,
        strategy: strategy,
        hooks: optimizedReply.hooks,
        psychologyTriggers: optimizedReply.triggers,
        confidence: optimizedReply.confidence,
        reasoning: optimizedReply.reasoning,
        fallbackUsed: false,
        optimizedFor: this.determineOptimizationTarget(tweetAnalysis)
      }
      
    } catch (error) {
      console.error('Viral reply generation failed:', error)
      
      // Advanced fallback system
      return this.generateIntelligentFallback(options)
    }
  }

  /**
   * Analyze tweet content for viral potential and psychology
   */
  private async analyzeTweetForViral(tweetContent: string, context?: any): Promise<any> {
    const analysisPrompt = `As a viral content analyst who's studied millions of tweets, analyze this content:

TWEET: "${tweetContent}"
${context ? `CONTEXT: ${JSON.stringify(context)}` : ''}

Analyze and return JSON with:
{
  "emotion_primary": "primary emotion (excitement, frustration, curiosity, etc.)",
  "emotion_secondary": ["list", "of", "secondary", "emotions"],
  "content_type": "announcement|question|insight|story|complaint|celebration|other",
  "viral_potential": 0.1-1.0,
  "engagement_triggers": ["curiosity", "controversy", "relatability", "authority", "etc"],
  "topic_category": "tech|business|personal|lifestyle|etc",
  "conversation_starters": ["what questions/comments this could generate"],
  "pain_points": ["problems or challenges mentioned"],
  "opportunities": ["engagement opportunities"],
  "tone_energy": "low|medium|high",
  "keywords_viral": ["key", "viral", "words"],
  "psychological_hooks": ["status", "belonging", "curiosity", "fear", "joy", "etc"],
  "reply_difficulty": "easy|medium|hard",
  "best_reply_angles": ["different approaches to reply"],
  "avoid_topics": ["things to avoid in reply"]
}`

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: analysisPrompt }],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })

      const response = completion.choices[0]?.message?.content
      if (!response) throw new Error('No analysis response')
      
      return JSON.parse(response)
    } catch (error) {
      console.error('Tweet analysis failed:', error)
      return this.getDefaultAnalysis(tweetContent)
    }
  }

  /**
   * Generate primary viral reply using advanced prompting
   */
  private async generatePrimaryViralReply(
    options: ViralReplyOptions, 
    analysis: any, 
    strategy: string
  ): Promise<any> {
    
    const userStyles = options.userStyles || this.getDefaultStyles()
    
    const viralSystemPrompt = `You are the world's top viral content strategist. You've analyzed 10M+ viral tweets and know exactly what psychology makes content explode.

VIRAL REPLY MASTERY:

🧠 PSYCHOLOGY TRIGGERS:
- Curiosity Gap: Create questions that demand answers
- Social Proof: "I've seen this work..." / "Most people don't realize..."
- Authority: Share insider knowledge or contrarian views
- Surprise: Challenge assumptions or flip perspectives
- Relatability: Connect deeply with shared experiences
- Status: Help them look smart by association
- Belonging: Create "us vs them" or community feeling

🎯 VIRAL STRATEGIES BY TYPE:
1. CURIOSITY: "Here's what most people miss..." / "Plot twist:" / "The real question is..."
2. CONTROVERSY: "Unpopular opinion:" / "This is actually backwards..." / "Hot take:"
3. VALUE: "Here's the framework..." / "3 things I learned..." / "The secret is..."
4. EMOTION: "This hit me different..." / "I felt this in my soul..." / "This is why..."
5. AUTHORITY: "Having worked with 100+ companies..." / "From someone who's been there..."
6. SOCIAL-PROOF: "Everyone's talking about..." / "This is the pattern I see..."

🚀 VIRAL HOOKS THAT WORK:
- "This reminds me of when..." (story)
- "Everyone's doing X, but..." (contrarian)
- "I used to think X until..." (transformation)
- "The real reason this matters..." (insight)
- "What if I told you..." (curiosity)
- "This is exactly why..." (explanation)
- "Fun fact most people don't know..." (knowledge)
- "The thing nobody talks about..." (insider info)
- "This changes everything because..." (implication)
- "I've seen this movie before..." (pattern recognition)

USER PROFILE:
- Tone: ${userStyles.tone} (but viral-optimized)
- Personality: ${userStyles.personality} 
- Topics: ${userStyles.topics_of_interest?.join(', ') || 'business/tech'}
- Voice: ${userStyles.custom_instructions || 'authentic expert'}

TARGET STRATEGY: ${strategy.toUpperCase()}
TWEET ANALYSIS: ${JSON.stringify(analysis)}

VIRAL REPLY RULES:
1. Start with a hook that stops scrolls (first 5 words critical)
2. Add genuine insight or value (no generic responses)
3. Create emotional resonance with the audience
4. Include subtle engagement bait (questions, controversial takes)
5. Match energy level of original tweet
6. Sound like a real expert, never robotic
7. Make people want to like/share/reply
8. Keep under 280 characters
9. NO @mentions or promotional content
10. Make it shareable and quotable

GENERATE A REPLY THAT GOES VIRAL.`

    const userPrompt = `VIRAL REPLY MISSION:

ORIGINAL TWEET: "${options.tweetContent}"
AUTHOR: @${options.authorUsername}

VIRAL ANALYSIS:
${JSON.stringify(analysis, null, 2)}

STRATEGY TO USE: ${strategy.toUpperCase()}

YOUR MISSION: Create a reply that will:
- Get 100+ likes minimum
- Generate 10+ replies/comments
- Be the type people screenshot and share
- Position you as the expert in this space
- Create genuine value for readers

VIRAL PSYCHOLOGY TO APPLY:
Based on the analysis, use the most effective psychological triggers and hooks.

SPECIFIC REQUIREMENTS:
1. Open with one of the viral hooks that fits this content
2. Add a unique angle nobody else will have
3. Include subtle engagement bait
4. Make it quotable and memorable
5. Sound like it comes from someone with real expertise

Return JSON with:
{
  "content": "Your viral reply text",
  "hooks": ["hook1", "hook2"],
  "triggers": ["psychology1", "psychology2"],
  "confidence": 0.95,
  "reasoning": "Why this will go viral",
  "engagement_type": "likes|replies|retweets"
}`

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: viralSystemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.85,
        max_tokens: 300,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
        response_format: { type: 'json_object' }
      })

      const response = completion.choices[0]?.message?.content
      if (!response) throw new Error('No viral reply generated')

      return JSON.parse(response)
    } catch (error) {
      console.error('Primary viral reply generation failed:', error)
      throw error
    }
  }

  /**
   * Optimize reply for maximum viral potential
   */
  private async optimizeReplyForViral(reply: any, analysis: any): Promise<any> {
    const optimizationPrompt = `As a viral optimization expert, improve this reply for maximum engagement:

CURRENT REPLY: "${reply.content}"
TWEET ANALYSIS: ${JSON.stringify(analysis)}
HOOKS USED: ${reply.hooks?.join(', ')}
PSYCHOLOGY: ${reply.triggers?.join(', ')}

OPTIMIZATION CHECKLIST:
✓ Hook strength (first 5 words grab attention?)
✓ Emotional resonance (does it create feeling?)
✓ Value density (packed with insight?)
✓ Engagement bait (invites response?)
✓ Shareability (quotable/screenshot-worthy?)
✓ Authority positioning (sounds expert?)
✓ Conversation starter (generates replies?)

VIRAL OPTIMIZATION RULES:
1. Strengthen the hook if weak
2. Add more emotional weight
3. Include subtle controversy or surprise
4. Make it more quotable
5. Add engagement triggers
6. Ensure it's under 280 characters
7. Remove any boring or generic language

Return the OPTIMIZED version in JSON:
{
  "content": "Optimized viral reply",
  "hooks": ["improved hooks"],
  "triggers": ["psychology used"],
  "confidence": 0.9,
  "reasoning": "Why this optimization will work",
  "improvements": ["what was improved"]
}`

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: optimizationPrompt }],
        temperature: 0.7,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      })

      const response = completion.choices[0]?.message?.content
      if (!response) return reply // Return original if optimization fails

      const optimized = JSON.parse(response)
      return optimized.content ? optimized : reply
    } catch (error) {
      console.error('Reply optimization failed:', error)
      return reply // Return original if optimization fails
    }
  }

  /**
   * Select optimal viral strategy based on tweet analysis
   */
  private selectOptimalStrategy(analysis: any): string {
    const viralPotential = analysis.viral_potential || 0.5
    const contentType = analysis.content_type || 'other'
    const engagementTriggers = analysis.engagement_triggers || []
    
    // Strategy selection logic based on analysis
    if (contentType === 'question' && viralPotential > 0.7) {
      return 'authority' // Position as expert answering
    }
    
    if (engagementTriggers.includes('controversy') && viralPotential > 0.6) {
      return 'controversy' // Safe controversial take
    }
    
    if (contentType === 'announcement' || contentType === 'celebration') {
      return 'social-proof' // Amplify with social proof
    }
    
    if (analysis.emotion_primary === 'curiosity' || contentType === 'insight') {
      return 'curiosity' // Build on curiosity
    }
    
    if (engagementTriggers.includes('relatability')) {
      return 'emotion' // Connect emotionally
    }
    
    // Default to value-driven approach
    return 'value'
  }

  /**
   * Calculate viral score based on multiple factors
   */
  private calculateViralScore(reply: any, analysis: any): number {
    let score = 0.5 // Base score
    
    // Hook strength (first 5 words)
    const firstFiveWords = reply.content.split(' ').slice(0, 5).join(' ')
    const viralHooks = ['this reminds', 'plot twist', 'unpopular opinion', 'here\'s what', 'what if', 'fun fact', 'the real']
    if (viralHooks.some(hook => firstFiveWords.toLowerCase().includes(hook))) {
      score += 0.2
    }
    
    // Psychology triggers
    if (reply.triggers && reply.triggers.length >= 2) {
      score += 0.15
    }
    
    // Value density (insights, specific information)
    if (reply.content.includes('because') || reply.content.includes('reason') || reply.content.includes('why')) {
      score += 0.1
    }
    
    // Engagement bait (questions, controversial takes)
    if (reply.content.includes('?') || reply.content.toLowerCase().includes('hot take')) {
      score += 0.1
    }
    
    // Length optimization (80-200 chars tends to perform better)
    const length = reply.content.length
    if (length >= 80 && length <= 200) {
      score += 0.05
    }
    
    // Emotional words
    const emotionalWords = ['amazing', 'incredible', 'shocking', 'brilliant', 'genius', 'mind-blowing', 'game-changing']
    if (emotionalWords.some(word => reply.content.toLowerCase().includes(word))) {
      score += 0.1
    }
    
    return Math.min(score, 1.0)
  }

  /**
   * Generate intelligent fallback when AI fails
   */
  private generateIntelligentFallback(options: ViralReplyOptions): ViralReply {
    const content = options.tweetContent.toLowerCase()
    
    // Pattern-based fallbacks that still have viral potential
    let fallbackReply = ''
    
    if (content.includes('launch') || content.includes('announce')) {
      fallbackReply = "This is exactly the type of innovation we need right now. What's been your biggest learning so far?"
    } else if (content.includes('ai') || content.includes('automation')) {
      fallbackReply = "The AI revolution is happening faster than most people realize. What's your take on where this leads us?"
    } else if (content.includes('startup') || content.includes('founder')) {
      fallbackReply = "The startup journey is wild. What's the one thing you wish you knew before starting?"
    } else if (content.includes('?')) {
      fallbackReply = "Great question. Here's what I've learned from experience - it's not what most people expect..."
    } else if (content.includes('challenge') || content.includes('difficult')) {
      fallbackReply = "I've been there. The real breakthrough happens when you flip the problem upside down."
    } else {
      fallbackReply = "This hits different. What most people don't realize is the hidden psychology behind this..."
    }
    
    return {
      content: fallbackReply,
      viralScore: 0.6,
      strategy: 'fallback-intelligent',
      hooks: ['pattern-based'],
      psychologyTriggers: ['curiosity', 'relatability'],
      confidence: 0.7,
      reasoning: 'Intelligent fallback based on content patterns',
      fallbackUsed: true,
      optimizedFor: 'balance'
    }
  }

  /**
   * Get default styles when user hasn't customized
   */
  private getDefaultStyles(): any {
    return {
      tone: 'professional',
      personality: 'insightful',
      topics_of_interest: ['business', 'technology', 'entrepreneurship'],
      custom_instructions: 'Provide valuable insights with authority'
    }
  }

  /**
   * Get default analysis when AI analysis fails
   */
  private getDefaultAnalysis(tweetContent: string): any {
    return {
      emotion_primary: 'neutral',
      content_type: 'update',
      viral_potential: 0.5,
      engagement_triggers: ['value'],
      topic_category: 'general',
      tone_energy: 'medium',
      reply_difficulty: 'medium'
    }
  }

  /**
   * Determine what the reply should optimize for
   */
  private determineOptimizationTarget(analysis: any): 'likes' | 'replies' | 'retweets' | 'balance' {
    if (analysis.content_type === 'question') return 'replies'
    if (analysis.engagement_triggers?.includes('controversy')) return 'replies'
    if (analysis.content_type === 'insight') return 'retweets'
    if (analysis.viral_potential > 0.8) return 'likes'
    return 'balance'
  }

  /**
   * Store successful viral replies for learning
   */
  async storeViralReplySuccess(replyId: string, engagement: {
    likes: number
    replies: number
    retweets: number
    impressions?: number
  }): Promise<void> {
    try {
      await prisma.engagementAnalytics.create({
        data: {
          userId: 'system',
          engagementType: 'viral_reply_performance',
          engagementValue: engagement.likes + engagement.replies + engagement.retweets,
          replyId: replyId,
        }
      })
    } catch (error) {
      console.error('Failed to store viral reply success:', error)
    }
  }
}

export const viralReplyGenerator = new ViralReplyGenerator()