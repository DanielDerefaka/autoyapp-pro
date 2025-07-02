import { NextResponse } from 'next/server'
import { replyGenerator } from '@/lib/openai'

export async function POST() {
  try {
    // Test OpenAI API connectivity with a simple reply generation
    const testTweet = {
      content: "Just launched our new AI product! Excited to see what the community thinks 🚀",
      author: "testuser",
      context: "Product launch announcement"
    }
    
    // Test basic OpenAI configuration
    const hasApiKey = !!process.env.OPENAI_API_KEY
    
    if (!hasApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }
    
    // Test reply generation
    const reply = await replyGenerator.generateReply({
      tweetContent: testTweet.content,
      authorUsername: testTweet.author,
      replyTone: 'professional',
      includeCall2Action: false,
      maxLength: 280
    })
    
    // Test sentiment analysis
    const sentiment = await replyGenerator.analyzeSentiment(testTweet.content)
    
    return NextResponse.json({
      status: 'OpenAI API Test Successful',
      config: {
        hasApiKey,
      },
      testResults: {
        originalTweet: testTweet.content,
        generatedReply: reply,
        sentiment: sentiment,
      }
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'OpenAI API test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}