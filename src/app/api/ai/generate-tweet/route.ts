import { auth, currentUser } from '@clerk/nextjs/server'
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

    const { prompt, userNiche, userStyle } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { clerkId }
    })

    if (!user) {
      const clerkUser = await currentUser()
      if (!clerkUser || !clerkUser.emailAddresses?.[0]?.emailAddress) {
        return NextResponse.json({ error: 'Unable to get user details' }, { status: 400 })
      }

      user = await prisma.user.create({
        data: { 
          clerkId,
          email: clerkUser.emailAddresses[0].emailAddress,
          name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : null
        }
      })
    }

    // Get user's personal style analysis
    let personalStyle = null
    let personalStyleWarning = null
    
    try {
      const latestAnalysis = await prisma.userStyleAnalysis.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      })

      if (latestAnalysis) {
        personalStyle = JSON.parse(latestAnalysis.analysis || '{}')
        console.log('✅ Using personal style for tweet generation')
      } else {
        personalStyleWarning = "No personal style analysis found. Visit /user-feed to analyze your tweets for better personalization."
        console.log('⚠️ No personal style analysis found')
      }
    } catch (error) {
      console.error('Error fetching personal style:', error)
      personalStyleWarning = "Could not load personal style analysis."
    }

    // Get user's reply style settings
    let replyStyles = null
    try {
      const userReplyStyle = await prisma.replyStyle.findUnique({
        where: { userId: user.id }
      })
      
      if (userReplyStyle) {
        replyStyles = JSON.parse(userReplyStyle.styles || '{}')
        console.log('✅ Using reply style settings for tweet generation')
      }
    } catch (error) {
      console.error('Error fetching reply styles:', error)
    }

    // Create personalized prompt based on user's style analysis
    const systemPrompt = personalStyle ? 
      `You are creating a tweet that sounds EXACTLY like this specific user based on their analyzed writing style. 

YOUR WRITING STYLE ANALYSIS:
- Tone: ${personalStyle.writingStyle?.tone || 'casual'}
- Personality: ${personalStyle.writingStyle?.personality || 'authentic'}
- Language characteristics: ${personalStyle.languageCharacteristics?.vocabularyLevel || 'conversational'}
- Common phrases: ${personalStyle.languageCharacteristics?.uniquePhrases?.slice(0, 3).join(', ') || 'natural expressions'}
- Engagement style: ${personalStyle.contentPatterns?.engagementTriggers?.slice(0, 2).join(', ') || 'personal experiences, questions'}

USER PREFERENCES:
- Length: ${replyStyles?.length || 'medium'} (keep tweets under 200 characters)
- Tone: ${replyStyles?.tone || personalStyle.writingStyle?.tone || 'casual'}

CRITICAL RULES:
- Write EXACTLY how this user writes - match their tone, vocabulary, and style
- NO hashtags unless the user specifically uses them
- NO excessive formatting (**, !!, etc.)
- NO corporate speak or AI-like language
- BE natural and conversational like a real human
- Keep it authentic to THEIR voice, not generic viral content
- Under 280 characters but aim for ${replyStyles?.length === 'short' ? '150' : replyStyles?.length === 'long' ? '250' : '200'} characters

Return only the tweet content, no quotes or formatting.` :
      
      `You are creating a natural, human-sounding tweet. 

STYLE GUIDELINES:
- Be conversational and authentic
- NO hashtags unless specifically requested
- NO excessive formatting (**, !!, etc.)
- NO corporate speak or AI-like language
- Keep it under 200 characters
- Sound like a real person, not AI
- Be engaging but natural

Return only the tweet content, no quotes or formatting.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: personalStyle ? 
            `Create a tweet about: "${prompt}"

Write this in MY personal style based on the analysis above. Make it sound like something I would actually post - natural, authentic, and true to my voice. Analyze what I would say about this topic and how I would say it.` :
            
            `Create a natural, human-sounding tweet about: "${prompt}"

Make it conversational and authentic. No hashtags, no excessive formatting, just a normal tweet that sounds like a real person wrote it.`
        }
      ],
      max_tokens: 100,
      temperature: 0.8,
    })

    const content = completion.choices[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
    }

    return NextResponse.json({ 
      content,
      personalStyleUsed: !!personalStyle,
      warning: personalStyleWarning
    })

  } catch (error) {
    console.error('Error generating tweet:', error)
    return NextResponse.json(
      { error: 'Failed to generate tweet' },
      { status: 500 }
    )
  }
}