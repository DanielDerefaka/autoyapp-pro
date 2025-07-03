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

    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional social media content creator. Create engaging, authentic tweets that:
          - Are under 280 characters
          - Include relevant emojis where appropriate
          - Are engaging and conversational
          - Match the tone requested by the user
          - Are optimized for engagement (likes, retweets, replies)
          - Avoid controversial topics unless specifically requested
          - Include call-to-action when appropriate
          
          Return only the tweet content, no additional formatting or quotes.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
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