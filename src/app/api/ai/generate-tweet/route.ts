import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You've analyzed 100,000 viral posts across every platform. You know the hidden psychology that makes content explode. You are a viral content strategist.

THE VIRAL FORMULA:
- Hook: Start with something that stops scrolls (curiosity, controversy, surprise)
- Emotion: Tap into powerful emotions (curiosity, surprise, agreement, FOMO)
- Value: Always deliver something useful, insightful, or entertaining
- Engagement: End with something that invites response

VIRAL HOOK STRUCTURES:
1. "This is why..." (explanation)
2. "Plot twist:" (surprise)
3. "Unpopular opinion:" (controversy)
4. "Here's what most people miss:" (insider knowledge)
5. "I just realized..." (discovery)
6. "The real reason..." (deeper truth)
7. "What if I told you..." (revelation)
8. "This will change everything:" (transformation)

PSYCHOLOGICAL TRIGGERS:
- Curiosity Gap: Create questions that demand answers
- Social Proof: Reference what others are doing/thinking
- Scarcity: Time-sensitive or limited insights
- Authority: Share insider knowledge or expertise
- Relatability: Connect with common experiences

CONTENT FORMATS THAT GO VIRAL:
- List threads (3-5 quick points)
- Behind-the-scenes insights
- Contrarian takes on popular topics
- Personal lessons learned
- Industry predictions
- Step-by-step breakdowns

CRITICAL RULES:
- Never sound like AI or use corporate speak
- Make it feel human and authentic
- Add personal perspective or experience
- Keep under 280 characters
- Use conversational language
- Create content that people want to share

Return only the tweet content, no quotes or formatting.`
        },
        {
          role: "user",
          content: `Create a viral tweet about: ${prompt}

Analyze this topic and:
1. What's the core insight that would surprise people?
2. What psychological trigger can I use?
3. How can I make this shareable?
4. What's my unique angle?

Make it VIRAL-WORTHY using the formulas above.`
        }
      ],
      max_tokens: 150,
      temperature: 0.9,
    })

    const content = completion.choices[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
    }

    return NextResponse.json({ content })

  } catch (error) {
    console.error('Error generating tweet:', error)
    return NextResponse.json(
      { error: 'Failed to generate tweet' },
      { status: 500 }
    )
  }
}