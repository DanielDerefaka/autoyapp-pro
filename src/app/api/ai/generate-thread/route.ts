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
          content: `You are a professional social media content creator. Create engaging Twitter threads that:
          - Each tweet is under 280 characters
          - Create 3-7 tweets in a thread format
          - Include relevant emojis where appropriate
          - Are engaging and tell a complete story
          - Have a strong opening hook
          - End with a call-to-action or question
          - Use numbered format (1/n, 2/n, etc.) for tweet numbering
          - Are optimized for engagement and retweets
          - Maintain consistent tone throughout
          
          Return the response as a JSON array of tweet strings, with each tweet being a separate element.
          Example format: ["1/5 Here's why AI will change everything... 🧵", "2/5 First, let's look at the current landscape...", ...]`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
    }

    try {
      // Try to parse as JSON first
      const tweets = JSON.parse(content)
      if (Array.isArray(tweets)) {
        return NextResponse.json({ tweets })
      }
    } catch (parseError) {
      // If JSON parsing fails, split by line breaks and clean up
      const tweets = content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^["']|["']$/g, '').trim())
        .filter(line => line.length > 0)
      
      if (tweets.length === 0) {
        return NextResponse.json({ error: 'No valid tweets generated' }, { status: 500 })
      }
      
      return NextResponse.json({ tweets })
    }

    return NextResponse.json({ error: 'Invalid response format' }, { status: 500 })

  } catch (error) {
    console.error('Error generating thread:', error)
    return NextResponse.json(
      { error: 'Failed to generate thread' },
      { status: 500 }
    )
  }
}