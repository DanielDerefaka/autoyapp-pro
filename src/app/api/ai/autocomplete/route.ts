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

    const { text, cursorPosition } = await request.json()

    if (!text || cursorPosition === undefined) {
      return NextResponse.json({ error: 'Text and cursor position are required' }, { status: 400 })
    }

    // Get the text before the cursor
    const textBeforeCursor = text.substring(0, cursorPosition)
    const textAfterCursor = text.substring(cursorPosition)

    // Don't provide suggestions for very short text
    if (textBeforeCursor.length < 10) {
      return NextResponse.json({ suggestions: [] })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI writing assistant helping users complete their tweets. Given the text before the cursor, provide 3 short, natural completions that:
          - Continue the thought naturally
          - Keep the total tweet under 280 characters
          - Match the tone and style of the existing text
          - Are engaging and tweet-appropriate
          - Don't repeat what's already written
          
          Return only the completion text that would continue from where the user left off. Don't include the original text.
          Return as a JSON array of 3 strings.`
        },
        {
          role: "user",
          content: `Text before cursor: "${textBeforeCursor}"
          Text after cursor: "${textAfterCursor}"
          
          Provide 3 natural completions for the text before the cursor.`
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json({ suggestions: [] })
    }

    try {
      const suggestions = JSON.parse(content)
      if (Array.isArray(suggestions)) {
        // Filter suggestions to ensure total length is under 280 characters
        const validSuggestions = suggestions
          .filter(suggestion => 
            typeof suggestion === 'string' && 
            (textBeforeCursor + suggestion + textAfterCursor).length <= 280
          )
          .slice(0, 3)
        
        return NextResponse.json({ suggestions: validSuggestions })
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract suggestions from the text
      const lines = content.split('\n').filter(line => line.trim().length > 0)
      const suggestions = lines
        .map(line => line.replace(/^[\d\-\.\s]*/, '').trim())
        .filter(suggestion => 
          suggestion.length > 0 && 
          (textBeforeCursor + suggestion + textAfterCursor).length <= 280
        )
        .slice(0, 3)
      
      return NextResponse.json({ suggestions })
    }

    return NextResponse.json({ suggestions: [] })

  } catch (error) {
    console.error('Error generating autocomplete:', error)
    return NextResponse.json({ suggestions: [] })
  }
}