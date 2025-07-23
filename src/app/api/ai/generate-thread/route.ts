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

    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Create a Twitter thread (3-5 tweets) that sounds natural and human:
          
          - Each tweet under 280 characters
          - NO excessive formatting (**, !!, etc.)
          - NO hashtags unless specifically requested
          - NO corporate speak or AI-like language
          - Sound like a real person sharing insights
          - Create a flowing narrative across tweets
          - Be conversational and authentic
          
          Return as a JSON array of tweet strings.
          Example: ["First insight about the topic...", "Here's what I learned...", "The key thing is..."]`
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