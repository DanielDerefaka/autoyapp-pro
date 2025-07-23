import { ViralStylesManager } from './viral-styles'
import { prisma } from './prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ViralReplyOptions {
  tweetContent: string
  authorUsername: string
  userStyles?: any
  userId?: string
  context?: {
    sentiment?: number
  }
  viralStrategy?: 'auto' | 'curiosity-gap' | 'social-proof-amplifier' | 'value-bomb' | 'controversy-controlled'
}

export interface ViralReplyResult {
  content: string
  viralScore: number
  strategy: string
  hooks: string[]
  psychologyTriggers: string[]
  confidence: number
  reasoning: string
  optimizedFor: string
}

export class ViralReplyGenerator {
  
  async generateViralReply(options: ViralReplyOptions): Promise<ViralReplyResult> {
    const {
      tweetContent,
      authorUsername,
      userStyles,
      userId,
      context = {},
      viralStrategy = 'auto'
    } = options

    // Get user's personal style analysis if userId provided
    let personalStyle = null
    let personalStyleError = null
    if (userId) {
      try {
        personalStyle = await this.getUserPersonalStyle(userId)
        console.log('🎯 Using personal style for reply generation')
      } catch (error) {
        personalStyleError = error.message
        console.log('⚠️ Could not fetch user personal style:', error.message)
      }
    }

    // Get viral combo suggestion
    const viralCombo = ViralStylesManager.suggestViralCombo(tweetContent, 'balance')
    
    // Use specific strategy if provided, otherwise use suggested
    const strategy = viralStrategy === 'auto' 
      ? viralCombo.strategy 
      : ViralStylesManager.getStrategy(viralStrategy) || viralCombo.strategy
    
    const personality = viralCombo.personality

    // Generate enhanced viral prompt with personal style
    const viralPrompt = this.generateEnhancedViralPrompt(
      personality,
      strategy,
      {
        tweetContent,
        authorUsername,
        topic: this.extractTopic(tweetContent),
        contentType: this.classifyContent(tweetContent)
      },
      personalStyle,
      userStyles
    )

    // Generate reply using OpenAI
    const reply = await this.generateWithOpenAI(viralPrompt, userStyles, personalStyle)
    
    // Calculate viral score (higher with personal style)
    const baseScore = personality.viralScore * strategy.effectiveness
    const personalStyleBonus = personalStyle ? 0.15 : 0
    const viralScore = Math.min(baseScore + personalStyleBonus, 1.0)

    return {
      content: reply,
      viralScore,
      strategy: strategy.name,
      hooks: personality.hooks.slice(0, 3),
      psychologyTriggers: strategy.triggers,
      confidence: personalStyle ? 0.92 : 0.85,
      reasoning: personalStyle 
        ? `${viralCombo.reasoning} Enhanced with your personal writing style.`
        : personalStyleError 
        ? `${viralCombo.reasoning} Note: ${personalStyleError}`
        : viralCombo.reasoning,
      optimizedFor: personalStyle ? 'your unique voice + viral engagement' : 'balanced engagement',
      personalStyleUsed: !!personalStyle
    }
  }

  private async getUserPersonalStyle(userId: string) {
    // Get the user's most recent style analysis
    const latestAnalysis = await prisma.userStyleAnalysis.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    if (!latestAnalysis) {
      // Check if user has any tweets to analyze
      const userTweets = await prisma.userTweet.findMany({
        where: { userId },
        take: 5
      })
      
      if (userTweets.length > 0) {
        console.log(`🧠 User has ${userTweets.length} tweets but no analysis. Consider analyzing their tweets first.`)
      } else {
        console.log(`📝 User has no tweets analyzed yet. They should visit /user-feed to analyze their tweets.`)
      }
      
      throw new Error('No personal style analysis found. Please analyze your tweets first at /user-feed')
    }

    const analysis = JSON.parse(latestAnalysis.analysis || '{}')
    console.log(`✅ Using personal style analysis from ${latestAnalysis.createdAt.toDateString()}`)
    return analysis
  }

  private generateEnhancedViralPrompt(
    personality: any,
    strategy: any,
    context: any,
    personalStyle: any,
    userStyles: any
  ): string {
    const { tweetContent, authorUsername } = context
    const userTone = userStyles?.tone || personalStyle?.writingStyle?.tone || 'casual'
    const userLength = userStyles?.length || 'short'
    
    return `You are replying to this tweet: "${tweetContent}"

REPLY REQUIREMENTS:
- Keep it ${userLength === 'short' ? 'under 50 characters' : userLength === 'medium' ? '50-100 characters' : '100-150 characters'}
- Sound like a real human, NOT AI
- Be ${userTone} and natural
- NO bullet points, numbered lists, or ** formatting
- NO emojis unless the original tweet has them
- Make it conversational and authentic
- Connect directly to what they posted about

${personalStyle ? `
YOUR PERSONAL STYLE (use this):
- You typically write: ${personalStyle.writingStyle?.tone || 'casual'} tone
- Your personality: ${personalStyle.writingStyle?.personality || 'authentic'}
- You often use: ${personalStyle.contentPatterns?.engagementTriggers?.slice(0, 2).join(', ') || 'personal experiences, questions'}
` : ''}

EXAMPLES OF GOOD REPLIES:
- "Been there! What worked for me was just starting before I felt ready"
- "This hits different. Took me way too long to learn this lesson"
- "Exactly! The daily grind is where the magic happens"
- "100% agree. Consistency beats intensity every time"

Generate a natural, human reply that fits YOUR voice:`
  }

  private async generateWithOpenAI(viralPrompt: string, userStyles?: any, personalStyle?: any): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a human replying naturally to tweets. Keep responses short, authentic, and conversational. No AI-like formatting." },
          { role: "user", content: viralPrompt }
        ],
        max_tokens: 50, // Much shorter responses
        temperature: 0.9, // More creative and human-like
        presence_penalty: 0.6, // Avoid repetitive patterns
        frequency_penalty: 0.7, // Encourage more diverse language
      })

      const reply = completion.choices[0]?.message?.content?.trim()
      
      if (!reply) {
        throw new Error('No reply generated by OpenAI')
      }

      // Clean up the reply
      return reply
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/@\w+/g, '') // Remove any @ mentions
        .trim()

    } catch (error) {
      console.error('OpenAI API error in viral generator:', error)
      
      // Fallback to template-based generation
      return this.generateFallbackReply(userStyles?.tweetContent || 'This is interesting!')
    }
  }

  private generateFallbackReply(tweetContent: string): string {
    const content = tweetContent.toLowerCase()
    
    // Short, natural replies based on content
    if (content.includes('launch') || content.includes('ship')) {
      return "Congrats on shipping! 🚀"
    } else if (content.includes('learn') || content.includes('lesson')) {
      return "This hits different. Great lesson!"
    } else if (content.includes('grow') || content.includes('journey')) {
      return "Been there. The growth journey is wild"
    } else if (content.includes('build') || content.includes('create')) {
      return "Love seeing the building process!"
    } else if (content.includes('?')) {
      return "Great question. Makes you think"
    } else {
      const naturalReplies = [
        "This is so true",
        "Exactly my experience too",
        "100% agree with this",
        "Been thinking about this lately",
        "This hits different",
        "Facts. Learned this the hard way"
      ]
      return naturalReplies[Math.floor(Math.random() * naturalReplies.length)]
    }
  }

  private extractTopic(content: string): string {
    const topics = ['ai', 'startup', 'business', 'technology', 'marketing', 'product']
    for (const topic of topics) {
      if (content.toLowerCase().includes(topic)) {
        return topic
      }
    }
    return 'general'
  }

  private classifyContent(content: string): string {
    if (content.includes('?')) return 'question'
    if (content.includes('launch') || content.includes('announce')) return 'announcement'
    if (content.includes('think') || content.includes('opinion')) return 'opinion'
    return 'insight'
  }
}

// Export singleton instance
export const viralReplyGenerator = new ViralReplyGenerator()