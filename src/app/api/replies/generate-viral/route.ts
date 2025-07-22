import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { viralReplyGenerator, ViralReplyOptions } from '@/lib/viral-reply-generator'
import { z } from 'zod'

const generateViralRequestSchema = z.object({
  tweetId: z.string(),
  tweetContent: z.string(),
  authorUsername: z.string(),
  targetUserId: z.string().optional(),
  context: z.object({
    authorFollowers: z.number().optional(),
    tweetEngagement: z.object({
      likes: z.number(),
      retweets: z.number(),
      replies: z.number()
    }).optional(),
    authorVerified: z.boolean().optional(),
    tweetAge: z.number().optional(), // hours
    industry: z.string().optional(),
    sentiment: z.number().optional()
  }).optional(),
  viralStrategy: z.enum(['curiosity', 'controversy', 'value', 'emotion', 'authority', 'social-proof', 'auto']).optional(),
  options: z.object({
    generateMultiple: z.boolean().optional(),
    count: z.number().min(1).max(5).optional(),
    optimizeFor: z.enum(['likes', 'replies', 'retweets', 'balance']).optional(),
    includeAnalytics: z.boolean().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = generateViralRequestSchema.parse(body)
    
    const {
      tweetId,
      tweetContent,
      authorUsername,
      targetUserId,
      context,
      viralStrategy = 'auto',
      options = {}
    } = validatedData

    console.log(`🚀 Generating viral AI reply for tweet: "${tweetContent.substring(0, 50)}..."`)

    // Get user from database to access reply styles and history
    const user = await getUserWithStyles(clerkId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse user's custom reply styles
    let userStyles = null
    if (user.replyStyle) {
      try {
        userStyles = JSON.parse(user.replyStyle.styles)
      } catch (error) {
        console.error('Error parsing user reply styles:', error)
      }
    }

    // Build viral reply options
    const viralOptions: ViralReplyOptions = {
      tweetContent,
      authorUsername,
      targetUserId,
      userStyles,
      context,
      viralStrategy
    }

    // Generate multiple viral replies if requested
    const count = options.generateMultiple ? (options.count || 3) : 1
    const viralReplies = []

    for (let i = 0; i < count; i++) {
      // Vary strategy for multiple generations
      const currentStrategy = count > 1 && viralStrategy === 'auto' ? 
        ['curiosity', 'value', 'emotion', 'authority', 'social-proof'][i % 5] as any :
        viralStrategy

      const viralReply = await viralReplyGenerator.generateViralReply({
        ...viralOptions,
        viralStrategy: currentStrategy
      })

      viralReplies.push(viralReply)

      // Small delay between generations to get variety
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    // Sort by viral score if multiple replies
    if (count > 1) {
      viralReplies.sort((a, b) => b.viralScore - a.viralScore)
    }

    // Store generation for analytics
    if (options.includeAnalytics !== false) {
      await storeReplyGeneration(user.id, tweetId, viralReplies[0])
    }

    // Return single reply or multiple based on request
    const response = count === 1 ? {
      reply: viralReplies[0].content,
      tweetId,
      viralScore: viralReplies[0].viralScore,
      strategy: viralReplies[0].strategy,
      psychology: {
        hooks: viralReplies[0].hooks,
        triggers: viralReplies[0].psychologyTriggers
      },
      confidence: viralReplies[0].confidence,
      reasoning: viralReplies[0].reasoning,
      optimizedFor: viralReplies[0].optimizedFor,
      fallbackUsed: viralReplies[0].fallbackUsed,
      generatedAt: new Date().toISOString()
    } : {
      replies: viralReplies.map((vr, index) => ({
        id: index + 1,
        content: vr.content,
        viralScore: vr.viralScore,
        strategy: vr.strategy,
        psychology: {
          hooks: vr.hooks,
          triggers: vr.psychologyTriggers
        },
        confidence: vr.confidence,
        reasoning: vr.reasoning,
        optimizedFor: vr.optimizedFor
      })),
      bestReply: viralReplies[0].content,
      tweetId,
      averageViralScore: viralReplies.reduce((sum, vr) => sum + vr.viralScore, 0) / viralReplies.length,
      generatedAt: new Date().toISOString()
    }

    console.log(`✅ Generated viral reply with score: ${viralReplies[0].viralScore.toFixed(2)}`)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in viral reply generation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    // Enhanced fallback for API errors
    try {
      const body = await request.json()
      const fallbackReply = generateEnhancedFallback(body.tweetContent, body.authorUsername)
      
      return NextResponse.json({
        reply: fallbackReply,
        tweetId: body.tweetId,
        viralScore: 0.6,
        strategy: 'enhanced-fallback',
        psychology: { hooks: ['pattern-based'], triggers: ['curiosity'] },
        confidence: 0.7,
        reasoning: 'Enhanced fallback due to API error',
        optimizedFor: 'balance',
        fallbackUsed: true,
        generatedAt: new Date().toISOString()
      })
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'Failed to generate viral reply', details: 'Please try again' },
        { status: 500 }
      )
    }
  }
}

/**
 * Get user with styles, handling table existence gracefully
 */
async function getUserWithStyles(clerkId: string) {
  try {
    return await prisma.user.findUnique({
      where: { clerkId },
      include: { replyStyle: true }
    })
  } catch (error: any) {
    // If ReplyStyle table doesn't exist, get user without it
    if (error.code === 'P2021' || error.message.includes('does not exist')) {
      console.log('ReplyStyle table does not exist, using defaults')
      return await prisma.user.findUnique({
        where: { clerkId }
      })
    }
    throw error
  }
}

/**
 * Store reply generation for analytics and learning
 */
async function storeReplyGeneration(userId: string, tweetId: string, viralReply: any) {
  try {
    await prisma.engagementAnalytics.create({
      data: {
        userId,
        engagementType: 'viral_reply_generated',
        engagementValue: Math.round(viralReply.viralScore * 100),
        trackedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Failed to store reply generation analytics:', error)
  }
}

/**
 * Enhanced fallback system with viral elements
 */
function generateEnhancedFallback(tweetContent: string, authorUsername: string): string {
  const content = tweetContent.toLowerCase()
  
  // Advanced pattern matching for viral responses
  if (content.includes('launch') || content.includes('released') || content.includes('announce')) {
    return "This is exactly the type of innovation the industry needs. What's been your biggest challenge in bringing this to market?"
  }
  
  if (content.includes('ai') || content.includes('artificial intelligence') || content.includes('automation')) {
    return "The AI transformation is happening faster than most realize. What's your prediction for the biggest shift we'll see this year?"
  }
  
  if (content.includes('startup') || content.includes('founder') || content.includes('entrepreneur')) {
    return "The entrepreneur's journey in 2024 hits different. What's the one insight you wish more founders understood?"
  }
  
  if (content.includes('growth') || content.includes('scale') || content.includes('revenue')) {
    return "Growth in today's market requires a completely different playbook. What's been your biggest learning curve?"
  }
  
  if (content.includes('team') || content.includes('hiring') || content.includes('culture')) {
    return "Building culture remotely changes everything. What's your approach to keeping that human connection?"
  }
  
  if (content.includes('product') || content.includes('feature') || content.includes('build')) {
    return "Product-market fit feels impossible until it suddenly clicks. What was your 'aha' moment?"
  }
  
  if (content.includes('?')) {
    return "Great question. Here's what I've learned from experience - most people approach this backwards..."
  }
  
  if (content.includes('challenge') || content.includes('difficult') || content.includes('struggle')) {
    return "I've been there. The breakthrough usually happens when you stop fighting the problem and start dancing with it."
  }
  
  if (content.includes('market') || content.includes('industry') || content.includes('business')) {
    return "The market dynamics have shifted completely. What most people don't realize is the hidden opportunity in this change."
  }
  
  // Default viral fallback
  return "This hits different. What most people miss is the psychological shift happening beneath the surface here."
}

// Also support GET for API documentation
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/replies/generate-viral',
    description: 'Generate viral-optimized AI replies with advanced psychology',
    methods: ['POST'],
    features: [
      'Advanced viral content psychology',
      'Multiple generation strategies',
      'Real-time viral scoring',
      'Psychology trigger analysis', 
      'Custom user style integration',
      'Multiple reply generation',
      'Enhanced fallback system'
    ],
    request_body: {
      tweetId: 'string (required)',
      tweetContent: 'string (required)',
      authorUsername: 'string (required)', 
      targetUserId: 'string (optional)',
      context: 'object (optional) - engagement data, follower count, etc',
      viralStrategy: 'enum (optional) - curiosity|controversy|value|emotion|authority|social-proof|auto',
      options: {
        generateMultiple: 'boolean (optional)',
        count: 'number (optional, 1-5)',
        optimizeFor: 'enum (optional) - likes|replies|retweets|balance',
        includeAnalytics: 'boolean (optional)'
      }
    },
    example_strategies: {
      curiosity: 'Creates information gaps that demand engagement',
      controversy: 'Safe controversial takes that generate discussion',
      value: 'Packed with actionable insights and knowledge',
      emotion: 'Taps into deep emotional triggers and relatability',
      authority: 'Positions as expert with insider knowledge',
      'social-proof': 'Uses collective experience and social validation',
      auto: 'AI selects optimal strategy based on content analysis'
    }
  })
}