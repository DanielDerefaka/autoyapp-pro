import { NextRequest, NextResponse } from 'next/server'
import { viralReplyGenerator } from '@/lib/viral-reply-generator'
import { ViralStylesManager } from '@/lib/viral-styles'

/**
 * Test endpoint for viral reply generation
 * Demonstrates different personalities and strategies
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      tweetContent, 
      authorUsername = 'testuser',
      strategy = 'auto',
      personality,
      testMode = true 
    } = await request.json()

    if (!tweetContent) {
      return NextResponse.json({ error: 'tweetContent is required' }, { status: 400 })
    }

    console.log(`🧪 Testing viral reply generation for: "${tweetContent.substring(0, 50)}..."`)

    // Get personality and strategy suggestions
    const suggestions = ViralStylesManager.suggestViralCombo(tweetContent)
    
    // Use suggested or specified personality
    const selectedPersonality = personality ? 
      ViralStylesManager.getPersonality(personality) : 
      suggestions.personality
    
    // Generate viral reply
    const viralReply = await viralReplyGenerator.generateViralReply({
      tweetContent,
      authorUsername,
      viralStrategy: strategy as any,
      userStyles: selectedPersonality ? {
        tone: selectedPersonality.tone,
        personality: selectedPersonality.personality,
        custom_instructions: `Use ${selectedPersonality.name} style with hooks: ${selectedPersonality.hooks.slice(0, 2).join(', ')}`
      } : undefined,
      context: {
        sentiment: 0.5,
        industry: 'tech'
      }
    })

    return NextResponse.json({
      success: true,
      reply: viralReply.content,
      viralScore: viralReply.viralScore,
      analysis: {
        strategy: viralReply.strategy,
        personality: selectedPersonality?.name || 'Default',
        hooks: viralReply.hooks,
        psychologyTriggers: viralReply.psychologyTriggers,
        optimizedFor: viralReply.optimizedFor,
        confidence: viralReply.confidence
      },
      reasoning: viralReply.reasoning,
      suggestions: {
        personality: suggestions.personality.name,
        strategy: suggestions.strategy.name,
        reasoning: suggestions.reasoning,
        alternativeHooks: suggestions.hooks
      },
      metadata: {
        fallbackUsed: viralReply.fallbackUsed,
        testMode,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Viral reply test error:', error)
    return NextResponse.json(
      { 
        error: 'Viral reply test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/test/viral-reply',
    description: 'Test viral reply generation with different strategies and personalities',
    usage: 'POST with { tweetContent, authorUsername?, strategy?, personality?, testMode? }',
    
    availableStrategies: [
      'auto', 'curiosity', 'controversy', 'value', 'emotion', 'authority', 'social-proof'
    ],
    
    availablePersonalities: ViralStylesManager.VIRAL_PERSONALITIES.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      viralScore: p.viralScore,
      bestFor: p.bestFor
    })),
    
    examples: {
      startup_launch: {
        tweetContent: "Just launched our AI-powered productivity app after 2 years of building. This is scary and exciting at the same time!",
        suggestedPersonality: "thought-leader",
        suggestedStrategy: "social-proof"
      },
      
      ai_discussion: {
        tweetContent: "AI will replace 40% of jobs in the next decade. Are we preparing people for this reality?",
        suggestedPersonality: "contrarian-expert", 
        suggestedStrategy: "controversy"
      },
      
      business_insight: {
        tweetContent: "The most successful remote teams have one thing in common: they over-communicate by design, not by accident.",
        suggestedPersonality: "pattern-spotter",
        suggestedStrategy: "value-bomb"
      }
    },
    
    tips: [
      "Use 'auto' strategy to let AI pick the best approach",
      "Try different personalities to see style variations",
      "Viral score 0.8+ indicates high engagement potential",
      "Psychology triggers show what makes the reply compelling",
      "Test mode provides additional analysis and suggestions"
    ]
  })
}