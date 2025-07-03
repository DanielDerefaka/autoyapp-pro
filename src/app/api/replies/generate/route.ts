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
  
  const systemPrompt = `You are an AI assistant that generates authentic, personalized replies to tweets for engagement automation. Your goal is to create replies that feel human, relevant, and valuable to the conversation.

IMPORTANT GUIDELINES:
1. DO NOT mention or tag the original author (no @username)
2. Create a standalone comment that adds value to the conversation
3. Keep replies under 280 characters
4. Match the tone and energy of the original tweet
5. Be authentic and conversational, not robotic or generic
6. Avoid overly promotional or sales-y language
7. Focus on the specific content and context of the tweet
8. Add your own perspective or insight when appropriate

USER'S STYLE PREFERENCES:
- Tone: ${styles.tone} (professional, casual, enthusiastic, thoughtful)
- Personality: ${styles.personality} (supportive, analytical, creative, direct)
- Length preference: ${styles.length} (short: 50-80 chars, medium: 80-150 chars, long: 150-280 chars)
- Engagement level: ${styles.engagement_level} (low: observational, medium: interactive, high: highly engaging)
- Interested topics: ${styles.topics_of_interest?.join(', ') || 'general'}
- Avoid topics: ${styles.avoid_topics?.join(', ') || 'none specified'}
${styles.custom_instructions ? `- Custom instructions: ${styles.custom_instructions}` : ''}

REPLY STYLES TO USE:
- For achievements/successes: Celebrate genuinely, add related insights
- For questions: Provide helpful answers or perspectives
- For industry insights: Build on the point with your own experience
- For personal updates: Show authentic interest and support
- For challenges/problems: Offer empathy and constructive suggestions
- For announcements: Show excitement and ask thoughtful follow-ups

Remember: The best replies feel like they come from a real person who genuinely read and thought about the tweet. Follow the user's style preferences while maintaining authenticity.`

  const userPrompt = `Original Tweet: "${tweetContent}"

Tweet Analysis:
- Topic: ${tweetAnalysis.topic}
- Tone: ${tweetAnalysis.tone}
- Type: ${tweetAnalysis.type}
- Keywords: ${tweetAnalysis.keywords.join(', ')}
- Sentiment: ${sentiment > 0.1 ? 'Positive' : sentiment < -0.1 ? 'Negative' : 'Neutral'}

Generate a personalized reply that:
1. Responds directly to the specific content
2. Adds value to the conversation
3. Feels authentic and human
4. Does NOT tag or mention the author
5. Matches the tone and energy of the original tweet

Reply:`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 100,
      temperature: 0.8, // Higher temperature for more creative, varied responses
      presence_penalty: 0.3, // Encourage diverse responses
      frequency_penalty: 0.3, // Reduce repetitive phrases
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