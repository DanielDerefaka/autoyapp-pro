import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tweetId, tweetContent, targetUsername, context } = body

    if (!tweetId || !tweetContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log(`🤖 Generating AI reply for tweet: "${tweetContent.substring(0, 50)}..."`)

    // Get user from database to access reply styles
    let user = null
    let userStyles = null
    
    try {
      user = await prisma.user.findUnique({
        where: { clerkId },
        include: { replyStyle: true }
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Get user's custom reply styles or use defaults
      if (user.replyStyle) {
        try {
          userStyles = JSON.parse(user.replyStyle.styles)
        } catch (error) {
          console.error('Error parsing user reply styles:', error)
        }
      }
    } catch (error: any) {
      // If table doesn't exist, just continue without custom styles
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        console.log('ReplyStyle table does not exist, using defaults')
        user = await prisma.user.findUnique({
          where: { clerkId }
        })
        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
      } else {
        throw error
      }
    }

    // Generate personalized reply using OpenAI with user's custom styles
    const reply = await generatePersonalizedReply(tweetContent, targetUsername, context, userStyles)

    return NextResponse.json({
      reply,
      tweetId,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error generating reply:', error)
    
    // Fallback to simple reply if OpenAI fails
    const fallbackReply = generateSimpleReply(tweetContent, targetUsername, context)
    
    return NextResponse.json({
      reply: fallbackReply,
      tweetId,
      generatedAt: new Date().toISOString(),
      fallback: true
    })
  }
}

async function generatePersonalizedReply(tweetContent: string, targetUsername: string, context: any, userStyles?: any): Promise<string> {
  const authorUsername = context?.authorUsername || targetUsername
  const sentiment = context?.sentiment || 0
  
  // Analyze the tweet content to determine topic and style
  const tweetAnalysis = analyzeTweetContent(tweetContent)
  
  // Default styles if user hasn't customized
  const defaultStyles = {
    tone: 'professional',
    personality: 'supportive',
    length: 'medium',
    engagement_level: 'medium',
    topics_of_interest: ['technology', 'business', 'entrepreneurship'],
    avoid_topics: ['politics', 'controversial'],
    custom_instructions: ''
  }
  
  const styles = userStyles || defaultStyles
  
  const systemPrompt = `You've analyzed 100,000 viral posts across every platform. You know the hidden psychology that makes content explode. You are a viral content strategist generating replies that get maximum engagement.

THE VIRAL REPLY FORMULA:
- Hook: Start with something that stops scrolls (curiosity, surprise, agreement)
- Emotion: Tap into powerful psychological triggers
- Value: Always add something useful, insightful, or entertaining
- Engagement: End with something that invites response

VIRAL REPLY HOOKS THAT WORK:
1. "This reminds me of..." (relatability)
2. "Plot twist:" (curiosity)
3. "Unpopular opinion:" (controversy)
4. "Here's what most people miss:" (insider knowledge)
5. "The real question is:" (deeper thinking)
6. "I've seen this before..." (experience)
7. "This is why..." (explanation)
8. "What if..." (possibility)
9. "Fun fact:" (knowledge)
10. "This hits different because..." (emotional connection)

PSYCHOLOGICAL TRIGGERS:
- Curiosity Gap: Create questions that demand answers
- Social Proof: Reference shared experiences
- Authority: Share insider knowledge
- Relatability: Connect with common struggles
- Surprise: Challenge common assumptions

USER'S NICHE & STYLE:
- Tone: ${styles.tone} (but make it viral-worthy)
- Personality: ${styles.personality} (authentic, not corporate)
- Length: ${styles.length} (optimized for engagement)
- Topics: ${styles.topics_of_interest?.join(', ') || 'general'}
- Avoid: ${styles.avoid_topics?.join(', ') || 'boring generic responses'}
${styles.custom_instructions ? `- Custom Voice: ${styles.custom_instructions}` : ''}

VIRAL REPLY STRATEGIES:
- For achievements: "This is exactly what I needed to see today" + insight
- For questions: Hook with contrarian view + valuable answer
- For insights: "Adding to this..." + unique perspective
- For updates: "The timing of this..." + personal connection
- For challenges: "I've been there..." + specific solution
- For announcements: "This changes everything because..." + implications

CRITICAL RULES:
1. NO @username mentions
2. Never sound like AI or corporate speak
3. Add genuine value or insight
4. Match the energy of the original tweet
5. Use conversational, human language
6. Create responses people want to like/reply to
7. Make it feel like insider knowledge
8. Focus on the specific content, not generic responses

Make every reply VIRAL-WORTHY and authentic.`

  const userPrompt = `TWEET TO ANALYZE & REPLY TO:
"${tweetContent}"

VIRAL ANALYSIS:
- Topic: ${tweetAnalysis.topic}
- Tone: ${tweetAnalysis.tone}
- Type: ${tweetAnalysis.type}
- Keywords: ${tweetAnalysis.keywords.join(', ')}
- Sentiment: ${sentiment > 0.1 ? 'Positive' : sentiment < -0.1 ? 'Negative' : 'Neutral'}

STRATEGIC QUESTIONS:
1. What's the core emotion/message in this tweet?
2. What psychological trigger can I use to create engagement?
3. How can I add unique value that stops scrolls?
4. What's my contrarian or insider perspective?
5. How can I make this reply shareable/memorable?

CREATE A VIRAL REPLY THAT:
- Uses one of the viral hook formulas
- Adds genuine insight or value
- Matches the energy of the original tweet
- Creates curiosity or emotional response
- Feels like it comes from a real expert
- Makes people want to engage further

DO NOT:
- Use generic phrases like "Great post!" or "Thanks for sharing"
- Sound robotic or corporate
- Be overly promotional
- Tag the author
- Use boring, predictable responses

MAKE IT VIRAL:`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 100,
      temperature: 0.9, // Higher temperature for more creative, viral responses
      presence_penalty: 0.4, // Encourage diverse responses
      frequency_penalty: 0.4, // Reduce repetitive phrases
    })

    const reply = completion.choices[0]?.message?.content?.trim()
    
    if (!reply) {
      throw new Error('No reply generated by OpenAI')
    }

    // Clean up the reply (remove quotes, ensure no @ mentions)
    const cleanReply = reply
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/@\w+/g, '') // Remove any @ mentions
      .trim()

    console.log(`✅ Generated personalized reply: "${cleanReply}"`)
    return cleanReply

  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
}

function analyzeTweetContent(tweetContent: string): {
  topic: string
  tone: string
  type: string
  keywords: string[]
} {
  const text = tweetContent.toLowerCase()
  const keywords = extractKeywords(text)
  
  // Determine topic based on keywords
  let topic = 'general'
  if (keywords.some(k => ['ai', 'artificial intelligence', 'machine learning', 'automation', 'tech', 'technology'].includes(k))) {
    topic = 'technology'
  } else if (keywords.some(k => ['startup', 'business', 'entrepreneur', 'founder', 'company', 'launch'].includes(k))) {
    topic = 'business'
  } else if (keywords.some(k => ['marketing', 'growth', 'sales', 'customer', 'brand'].includes(k))) {
    topic = 'marketing'
  } else if (keywords.some(k => ['build', 'building', 'development', 'code', 'programming'].includes(k))) {
    topic = 'development'
  } else if (keywords.some(k => ['team', 'hiring', 'culture', 'remote', 'work'].includes(k))) {
    topic = 'workplace'
  }

  // Determine tone
  let tone = 'neutral'
  if (text.includes('!') || keywords.some(k => ['excited', 'amazing', 'awesome', 'great', 'love'].includes(k))) {
    tone = 'enthusiastic'
  } else if (keywords.some(k => ['challenge', 'difficult', 'hard', 'struggle', 'problem'].includes(k))) {
    tone = 'thoughtful'
  } else if (text.includes('?')) {
    tone = 'inquisitive'
  }

  // Determine type
  let type = 'update'
  if (text.includes('?')) {
    type = 'question'
  } else if (keywords.some(k => ['launched', 'released', 'announcing', 'excited to share'].includes(k))) {
    type = 'announcement'
  } else if (keywords.some(k => ['tip', 'how to', 'advice', 'lesson', 'learned'].includes(k))) {
    type = 'educational'
  } else if (keywords.some(k => ['thank', 'grateful', 'appreciate', 'shoutout'].includes(k))) {
    type = 'appreciation'
  }

  return { topic, tone, type, keywords }
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'])
  
  return text
    .split(/\W+/)
    .filter(word => word.length > 2 && !commonWords.has(word))
    .slice(0, 10) // Take top 10 keywords
}

function generateSimpleReply(tweetContent: string, targetUsername: string, context: any): string {
  const sentiment = context?.sentiment || 0
  const authorUsername = context?.authorUsername || targetUsername

  // Simple reply templates based on sentiment and content keywords (NO @ mentions)
  const positiveReplies = [
    "This is fantastic news! Wishing you continued success! 🎉",
    "Love seeing this kind of progress. Inspiring to watch!",
    "This is really inspiring! Thanks for sharing your journey.",
    "Exciting times ahead! Looking forward to seeing what's next.",
    "Amazing achievement! The dedication really shows."
  ]

  const neutralReplies = [
    "Interesting perspective. Thanks for sharing your insights on this.",
    "Great point. This really resonates with my experience as well.",
    "Thanks for sharing this. Always valuable to hear different viewpoints.",
    "Appreciate this post. Definitely food for thought.",
    "Solid insights. This adds real value to the conversation."
  ]

  const negativeReplies = [
    "I understand the frustration. Have you considered trying a different approach?",
    "Sorry to hear about this challenge. Every setback can be a learning opportunity.",
    "Tough situation. Sometimes the best solutions come from difficult moments.",
    "I feel this. These challenges are what make us stronger in the end.",
    "Hang in there. Every entrepreneur faces these kinds of obstacles."
  ]

  let replyArray = neutralReplies
  if (sentiment > 0.3) {
    replyArray = positiveReplies
  } else if (sentiment < -0.2) {
    replyArray = negativeReplies
  }

  // Add specific responses for certain keywords (NO @ mentions)
  if (tweetContent.toLowerCase().includes('ai') || tweetContent.toLowerCase().includes('automation')) {
    replyArray = [
      "The AI space is evolving so quickly! Exciting to see how it's transforming businesses.",
      "Automation really is changing the game. Thanks for sharing your perspective.",
      "AI has so much potential. What's been your biggest learning so far?"
    ]
  }

  if (tweetContent.toLowerCase().includes('startup') || tweetContent.toLowerCase().includes('founder')) {
    replyArray = [
      "The startup journey is incredible! Every day brings new challenges and opportunities.",
      "Being a founder requires such resilience. Appreciate you sharing your experience.",
      "The startup ecosystem needs more voices like this. Keep sharing these insights!"
    ]
  }

  // Return a random reply from the appropriate array
  return replyArray[Math.floor(Math.random() * replyArray.length)]
}