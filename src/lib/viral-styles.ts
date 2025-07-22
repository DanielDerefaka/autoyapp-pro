/**
 * Viral Reply Styles Management System
 * Manages different viral content personalities and strategies
 */

export interface ViralPersonality {
  id: string
  name: string
  description: string
  tone: string
  personality: string
  hooks: string[]
  psychology: string[]
  examples: string[]
  bestFor: string[]
  viralScore: number
}

export interface ViralStrategy {
  id: string
  name: string
  description: string
  triggers: string[]
  hooks: string[]
  examples: string[]
  effectiveness: number
  useCases: string[]
}

export class ViralStylesManager {
  
  /**
   * Pre-defined viral personalities that work
   */
  static readonly VIRAL_PERSONALITIES: ViralPersonality[] = [
    {
      id: 'thought-leader',
      name: 'Thought Leader',
      description: 'Authoritative insights with industry expertise',
      tone: 'professional',
      personality: 'authoritative',
      hooks: [
        'Here\'s what most people miss...',
        'Having worked with 100+ companies...',
        'The real reason this matters...',
        'After 10 years in this space...'
      ],
      psychology: ['authority', 'social-proof', 'insider-knowledge'],
      examples: [
        'Having scaled 50+ teams, the real issue isn\'t hiring—it\'s the onboarding system most companies completely ignore.',
        'Here\'s what most VCs won\'t tell you: product-market fit is actually the third most important thing, not the first.'
      ],
      bestFor: ['business', 'entrepreneurship', 'leadership', 'strategy'],
      viralScore: 0.85
    },
    {
      id: 'contrarian-expert',
      name: 'Contrarian Expert',
      description: 'Challenges conventional wisdom with data-backed takes',
      tone: 'confident',
      personality: 'contrarian',
      hooks: [
        'Unpopular opinion:',
        'Everyone\'s doing X, but...',
        'This is actually backwards...',
        'Hot take:'
      ],
      psychology: ['controversy', 'curiosity', 'surprise'],
      examples: [
        'Unpopular opinion: Most "productivity hacks" actually make you less productive. The real secret is doing fewer things at 10x intensity.',
        'Everyone talks about work-life balance, but the most successful people I know have work-life integration instead.'
      ],
      bestFor: ['productivity', 'business', 'technology', 'lifestyle'],
      viralScore: 0.90
    },
    {
      id: 'story-connector',
      name: 'Story Connector',
      description: 'Connects through personal stories and relatability',
      tone: 'conversational',
      personality: 'relatable',
      hooks: [
        'This reminds me of...',
        'I used to think X until...',
        'I\'ve been there...',
        'This hits different because...'
      ],
      psychology: ['relatability', 'vulnerability', 'connection'],
      examples: [
        'This reminds me of when I first started my company and thought I needed to be available 24/7. Biggest mistake ever.',
        'I used to think networking was about collecting contacts. Now I realize it\'s about planting seeds and watering relationships.'
      ],
      bestFor: ['personal development', 'entrepreneurship', 'life lessons'],
      viralScore: 0.82
    },
    {
      id: 'insight-machine',
      name: 'Insight Machine',
      description: 'Delivers high-value insights and actionable frameworks',
      tone: 'educational',
      personality: 'valuable',
      hooks: [
        'Here\'s the framework...',
        '3 things I learned...',
        'The secret is...',
        'Here\'s how to...'
      ],
      psychology: ['value', 'education', 'practicality'],
      examples: [
        'Here\'s the framework I use to evaluate any business opportunity: Market size × Your unfair advantage × Execution difficulty. Skip any deal that doesn\'t score 7+ on all three.',
        'The secret to viral content isn\'t creativity—it\'s understanding these 3 psychological triggers that make people share.'
      ],
      bestFor: ['business', 'education', 'self-improvement', 'tutorials'],
      viralScore: 0.87
    },
    {
      id: 'future-predictor',
      name: 'Future Predictor',
      description: 'Shares predictions and trend analysis',
      tone: 'visionary',
      personality: 'forward-thinking',
      hooks: [
        'Mark my words:',
        'In 5 years...',
        'The future of X is...',
        'What if I told you...'
      ],
      psychology: ['curiosity', 'future-thinking', 'authority'],
      examples: [
        'Mark my words: By 2026, the companies that survive won\'t be the ones with the best AI—they\'ll be the ones with the best human-AI collaboration.',
        'What if I told you that remote work isn\'t the future of work—async work is?'
      ],
      bestFor: ['technology', 'business trends', 'innovation'],
      viralScore: 0.83
    },
    {
      id: 'pattern-spotter',
      name: 'Pattern Spotter',
      description: 'Identifies patterns and connects dots others miss',
      tone: 'analytical',
      personality: 'insightful',
      hooks: [
        'I\'ve noticed a pattern...',
        'This is the pattern I see...',
        'Connect the dots:',
        'Here\'s what\'s really happening...'
      ],
      psychology: ['pattern-recognition', 'insight', 'clarity'],
      examples: [
        'I\'ve noticed a pattern: The most successful remote teams don\'t optimize for productivity—they optimize for clarity.',
        'Connect the dots: AI writing tools → Content explosion → Attention scarcity → Human storytelling becomes premium again.'
      ],
      bestFor: ['analysis', 'trends', 'business', 'technology'],
      viralScore: 0.84
    }
  ]

  /**
   * Viral strategies with specific use cases
   */
  static readonly VIRAL_STRATEGIES: ViralStrategy[] = [
    {
      id: 'curiosity-gap',
      name: 'Curiosity Gap',
      description: 'Creates information gaps that demand completion',
      triggers: ['incomplete-information', 'mystery', 'surprise'],
      hooks: [
        'What most people don\'t realize...',
        'The thing nobody talks about...',
        'Here\'s the plot twist...',
        'You\'ll never guess what happened next...'
      ],
      examples: [
        'What most people don\'t realize about viral content is that it\'s not about being creative—it\'s about being psychologically precise.',
        'The thing nobody talks about in startup advice: 90% of "networking" events are actually productivity killers.'
      ],
      effectiveness: 0.89,
      useCases: ['education', 'announcements', 'insights', 'storytelling']
    },
    {
      id: 'social-proof-amplifier',
      name: 'Social Proof Amplifier',
      description: 'Uses collective experience and validation',
      triggers: ['belonging', 'validation', 'community'],
      hooks: [
        'Everyone\'s talking about...',
        'Most successful people I know...',
        'Every founder I work with...',
        'The pattern I see across...'
      ],
      examples: [
        'Most successful people I know have one thing in common: They treat their calendar like their bank account—every hour is an investment.',
        'Every founder I work with makes this same mistake: They optimize for perfection when they should optimize for speed.'
      ],
      effectiveness: 0.86,
      useCases: ['business advice', 'trends', 'best practices']
    },
    {
      id: 'value-bomb',
      name: 'Value Bomb',
      description: 'Delivers concentrated, actionable value',
      triggers: ['utility', 'practicality', 'results'],
      hooks: [
        'Here\'s exactly how to...',
        '5 things that changed my...',
        'The framework I use...',
        'Step-by-step process...'
      ],
      examples: [
        'Here\'s exactly how to get your first 1,000 followers: 1) Comment thoughtfully on 10 posts daily 2) Share one insight daily 3) DM 5 people with genuine questions. Repeat for 90 days.',
        'The framework I use for every business decision: Impact × Effort × Alignment. Score each 1-10. Only do things that score 24+ total.'
      ],
      effectiveness: 0.91,
      useCases: ['tutorials', 'advice', 'frameworks', 'how-to content']
    },
    {
      id: 'controversy-controlled',
      name: 'Controlled Controversy',
      description: 'Safe controversial takes that generate discussion',
      triggers: ['debate', 'disagreement', 'strong-opinions'],
      hooks: [
        'Unpopular opinion:',
        'This might be controversial but...',
        'Most people get this wrong:',
        'I\'m going to say what everyone\'s thinking:'
      ],
      examples: [
        'Unpopular opinion: "Follow your passion" is terrible advice. Follow your skills, develop your passion, monetize the intersection.',
        'This might be controversial but morning routines are overrated. Evening routines determine your next day\'s success.'
      ],
      effectiveness: 0.88,
      useCases: ['opinion pieces', 'industry critique', 'myth-busting']
    }
  ]

  /**
   * Get personality by ID
   */
  static getPersonality(id: string): ViralPersonality | null {
    return this.VIRAL_PERSONALITIES.find(p => p.id === id) || null
  }

  /**
   * Get strategy by ID  
   */
  static getStrategy(id: string): ViralStrategy | null {
    return this.VIRAL_STRATEGIES.find(s => s.id === id) || null
  }

  /**
   * Get best personality for content type
   */
  static getBestPersonalityForContent(contentType: string, topic: string): ViralPersonality {
    // Match personality to content
    for (const personality of this.VIRAL_PERSONALITIES) {
      if (personality.bestFor.some(area => 
        topic.toLowerCase().includes(area) || 
        contentType.toLowerCase().includes(area)
      )) {
        return personality
      }
    }
    
    // Default to thought leader for professional content
    return this.VIRAL_PERSONALITIES[0]
  }

  /**
   * Get best strategy for engagement goal
   */
  static getBestStrategyForGoal(goal: 'likes' | 'replies' | 'retweets' | 'balance'): ViralStrategy {
    switch (goal) {
      case 'likes':
        return this.getStrategy('value-bomb') || this.VIRAL_STRATEGIES[2]
      case 'replies':
        return this.getStrategy('controversy-controlled') || this.VIRAL_STRATEGIES[3]
      case 'retweets':
        return this.getStrategy('curiosity-gap') || this.VIRAL_STRATEGIES[0]
      case 'balance':
      default:
        return this.getStrategy('social-proof-amplifier') || this.VIRAL_STRATEGIES[1]
    }
  }

  /**
   * Generate custom viral prompt based on personality and strategy
   */
  static generateViralPrompt(
    personality: ViralPersonality,
    strategy: ViralStrategy,
    context: {
      tweetContent: string
      authorUsername: string
      topic: string
      contentType: string
    }
  ): string {
    return `You are a viral content expert using the "${personality.name}" personality with the "${strategy.name}" strategy.

PERSONALITY PROFILE:
- Tone: ${personality.tone}
- Style: ${personality.personality}
- Psychology: ${personality.psychology.join(', ')}
- Best hooks: ${personality.hooks.slice(0, 3).join(' | ')}

STRATEGY PROFILE:
- Method: ${strategy.description}
- Triggers: ${strategy.triggers.join(', ')}
- Effectiveness: ${Math.round(strategy.effectiveness * 100)}%

TWEET CONTEXT:
- Original: "${context.tweetContent}"
- Author: @${context.authorUsername}
- Topic: ${context.topic}
- Type: ${context.contentType}

VIRAL REPLY REQUIREMENTS:
1. Use one of the personality hooks: ${personality.hooks.slice(0, 2).join(' OR ')}
2. Apply ${strategy.name} psychology triggers
3. Match the ${personality.tone} tone
4. Create genuine value/insight
5. Generate engagement (questions, controversy, curiosity)
6. Stay under 280 characters
7. Sound human, not AI

EXAMPLES OF THIS STYLE:
${personality.examples.slice(0, 2).map((ex, i) => `${i + 1}. "${ex}"`).join('\n')}

Generate a viral reply that perfectly matches this personality and strategy.`
  }

  /**
   * Get random viral hook for personality
   */
  static getRandomHook(personalityId: string): string {
    const personality = this.getPersonality(personalityId)
    if (!personality || !personality.hooks.length) {
      return 'Here\'s what I think...'
    }
    
    return personality.hooks[Math.floor(Math.random() * personality.hooks.length)]
  }

  /**
   * Analyze content and suggest best personality + strategy combo
   */
  static suggestViralCombo(
    tweetContent: string,
    goal: 'likes' | 'replies' | 'retweets' | 'balance' = 'balance'
  ): {
    personality: ViralPersonality
    strategy: ViralStrategy
    reasoning: string
    hooks: string[]
  } {
    const content = tweetContent.toLowerCase()
    
    // Analyze content characteristics
    let suggestedPersonality: ViralPersonality
    let reasoning = ''
    
    if (content.includes('launch') || content.includes('announce') || content.includes('release')) {
      suggestedPersonality = this.getPersonality('insight-machine') || this.VIRAL_PERSONALITIES[3]
      reasoning = 'Announcement content works best with valuable insights and frameworks'
    } else if (content.includes('ai') || content.includes('future') || content.includes('prediction')) {
      suggestedPersonality = this.getPersonality('future-predictor') || this.VIRAL_PERSONALITIES[4]
      reasoning = 'Tech/future content resonates with forward-thinking perspectives'
    } else if (content.includes('?') || content.includes('opinion') || content.includes('think')) {
      suggestedPersonality = this.getPersonality('contrarian-expert') || this.VIRAL_PERSONALITIES[1]
      reasoning = 'Questions and opinions benefit from contrarian takes'
    } else if (content.includes('team') || content.includes('culture') || content.includes('people')) {
      suggestedPersonality = this.getPersonality('story-connector') || this.VIRAL_PERSONALITIES[2]
      reasoning = 'People-focused content needs relatable stories and connection'
    } else if (content.includes('trend') || content.includes('pattern') || content.includes('notice')) {
      suggestedPersonality = this.getPersonality('pattern-spotter') || this.VIRAL_PERSONALITIES[5]
      reasoning = 'Trend content works with pattern recognition and analysis'
    } else {
      suggestedPersonality = this.getPersonality('thought-leader') || this.VIRAL_PERSONALITIES[0]
      reasoning = 'General content benefits from authoritative thought leadership'
    }
    
    // Get strategy based on goal
    const strategy = this.getBestStrategyForGoal(goal)
    
    return {
      personality: suggestedPersonality,
      strategy,
      reasoning: `${reasoning}. Using ${strategy.name} strategy to optimize for ${goal}.`,
      hooks: suggestedPersonality.hooks.slice(0, 3)
    }
  }
}