import { NextResponse } from 'next/server'
import { ViralStylesManager } from '@/lib/viral-styles'

export async function GET() {
  try {
    const personalities = ViralStylesManager.VIRAL_PERSONALITIES.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      viralScore: p.viralScore,
      bestFor: p.bestFor,
      examples: p.examples.slice(0, 2)
    }))

    return NextResponse.json({
      availablePersonalities: personalities,
      availableStrategies: ViralStylesManager.VIRAL_STRATEGIES.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        effectiveness: s.effectiveness,
        useCases: s.useCases
      })),
      defaultStyle: {
        personality: 'thought-leader',
        tone: 'professional',
        viralStrategy: 'auto',
        topics_of_interest: ['technology', 'business', 'entrepreneurship'],
        engagement_goal: 'balance'
      }
    })
  } catch (error) {
    console.error('Error getting reply styles:', error)
    return NextResponse.json({ error: 'Failed to get reply styles' }, { status: 500 })
  }
}