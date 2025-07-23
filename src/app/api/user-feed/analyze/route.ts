import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    const clerkId = userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tweets, source } = await request.json()
    
    if (!tweets || !Array.isArray(tweets)) {
      return NextResponse.json({ error: 'Tweets array is required' }, { status: 400 })
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { clerkId }
    })

    if (!user) {
      // Get user details from Clerk
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

    // Analyze user's posting patterns
    const analysis = await analyzeUserTweets(tweets)
    
    // Store tweets and analysis in database
    const savedTweets = await saveTweetsToDatabase(user.id, tweets, source)
    const savedAnalysis = await saveAnalysisToDatabase(user.id, analysis)

    return NextResponse.json({
      success: true,
      message: `Analyzed ${tweets.length} tweets successfully`,
      analysis,
      tweetsStored: savedTweets.length,
      analysisId: savedAnalysis.id
    })
  } catch (error) {
    console.error('Error analyzing user tweets:', error)
    return NextResponse.json({ error: 'Failed to analyze tweets' }, { status: 500 })
  }
}

async function analyzeUserTweets(tweets: any[]) {
  try {
    // Prepare tweets for analysis
    const tweetTexts = tweets.map(tweet => tweet.content || tweet.text).join('\n\n')
    
    const analysisPrompt = `Analyze these tweets from a user to understand their posting style, voice, and patterns. Provide a comprehensive analysis for AI training.

TWEETS TO ANALYZE:
${tweetTexts}

ANALYSIS REQUIREMENTS:
1. WRITING STYLE:
   - Tone (professional, casual, enthusiastic, etc.)
   - Personality traits
   - Emotional patterns
   - Formality level

2. CONTENT PATTERNS:
   - Common topics and themes
   - Types of content (insights, questions, stories, etc.)
   - Posting frequency patterns
   - Engagement triggers used

3. LANGUAGE CHARACTERISTICS:
   - Vocabulary level and complexity
   - Sentence structure preferences
   - Use of emojis, hashtags, mentions
   - Unique phrases or expressions

4. VIRAL ELEMENTS:
   - What makes their content engaging
   - Psychological triggers they use
   - Storytelling patterns
   - Call-to-action styles

5. AI TRAINING INSIGHTS:
   - Key characteristics to replicate
   - Voice consistency patterns
   - Content formulas they use
   - Engagement optimization techniques

Provide detailed analysis in JSON format with specific examples and actionable insights for AI reply generation.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert content analyst specializing in social media voice and style analysis for AI training." },
        { role: "user", content: analysisPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.3
    })

    const analysisText = completion.choices[0]?.message?.content
    
    if (!analysisText) {
      throw new Error('No analysis generated')
    }

    // Try to parse as JSON, fallback to structured text
    let structuredAnalysis
    try {
      structuredAnalysis = JSON.parse(analysisText)
    } catch {
      structuredAnalysis = parseAnalysisText(analysisText)
    }

    return {
      ...structuredAnalysis,
      totalTweets: tweets.length,
      analysisDate: new Date().toISOString(),
      confidence: 0.85
    }

  } catch (error) {
    console.error('Error in AI analysis:', error)
    
    // Fallback to basic analysis
    return generateBasicAnalysis(tweets)
  }
}

function parseAnalysisText(text: string) {
  // Parse structured text analysis into JSON format
  return {
    writingStyle: {
      tone: extractPattern(text, /tone[:\s]+([^\n\.]+)/i),
      personality: extractPattern(text, /personality[:\s]+([^\n\.]+)/i),
      formality: 'moderate'
    },
    contentPatterns: {
      commonTopics: extractTopics(text),
      contentTypes: ['insights', 'questions', 'updates'],
      engagementTriggers: ['storytelling', 'questions', 'data']
    },
    languageCharacteristics: {
      vocabularyLevel: 'professional',
      sentenceStructure: 'varied',
      uniquePhrases: []
    },
    viralElements: {
      engagementFactors: ['authenticity', 'value', 'relatability'],
      psychologicalTriggers: ['curiosity', 'social-proof'],
      storytellingPatterns: ['personal-experience', 'lessons-learned']
    },
    aiTrainingInsights: {
      keyCharacteristics: ['consistent-voice', 'value-driven'],
      voiceConsistency: 'high',
      contentFormulas: ['hook-insight-action'],
      optimizationTechniques: ['question-endings', 'data-support']
    }
  }
}

function extractPattern(text: string, regex: RegExp): string {
  const match = text.match(regex)
  return match ? match[1].trim() : 'professional'
}

function extractTopics(text: string): string[] {
  const commonTopics = ['business', 'technology', 'entrepreneurship', 'marketing', 'leadership', 'productivity']
  return commonTopics.filter(topic => 
    text.toLowerCase().includes(topic.toLowerCase())
  ).slice(0, 5)
}

function generateBasicAnalysis(tweets: any[]) {
  const tweetTexts = tweets.map(t => t.content || t.text || '').join(' ')
  
  return {
    writingStyle: {
      tone: detectTone(tweetTexts),
      personality: 'professional',
      formality: 'moderate'
    },
    contentPatterns: {
      commonTopics: extractTopics(tweetTexts),
      contentTypes: classifyContentTypes(tweets),
      engagementTriggers: ['questions', 'insights']
    },
    languageCharacteristics: {
      vocabularyLevel: 'professional',
      avgLength: Math.round(tweetTexts.length / tweets.length),
      uniquePhrases: []
    },
    viralElements: {
      engagementFactors: ['authenticity', 'value'],
      psychologicalTriggers: ['curiosity'],
      storytellingPatterns: ['experience-based']
    },
    aiTrainingInsights: {
      keyCharacteristics: ['consistent', 'professional'],
      voiceConsistency: 'medium',
      contentFormulas: ['statement-explanation'],
      optimizationTechniques: ['clear-communication']
    },
    totalTweets: tweets.length,
    analysisDate: new Date().toISOString(),
    confidence: 0.65
  }
}

function detectTone(text: string): string {
  const lowerText = text.toLowerCase()
  if (lowerText.includes('!') && (lowerText.includes('amazing') || lowerText.includes('excited'))) {
    return 'enthusiastic'
  } else if (lowerText.includes('?') || lowerText.includes('think') || lowerText.includes('consider')) {
    return 'thoughtful'
  } else {
    return 'professional'
  }
}

function classifyContentTypes(tweets: any[]): string[] {
  const types = []
  tweets.forEach(tweet => {
    const text = (tweet.content || tweet.text || '').toLowerCase()
    if (text.includes('?')) types.push('question')
    if (text.includes('tip') || text.includes('how to')) types.push('educational')
    if (text.includes('story') || text.includes('experience')) types.push('story')
    if (text.includes('data') || text.includes('%')) types.push('data-driven')
  })
  return [...new Set(types)].slice(0, 4)
}

async function saveTweetsToDatabase(userId: string, tweets: any[], source: string) {
  const savedTweets = []
  
  for (const tweet of tweets) {
    try {
      const savedTweet = await prisma.userTweet.create({
        data: {
          userId,
          content: tweet.content || tweet.text || '',
          originalId: tweet.id || `manual_${Date.now()}_${Math.random()}`,
          source: source || 'manual',
          metadata: JSON.stringify({
            timestamp: tweet.timestamp || new Date().toISOString(),
            likes: tweet.likes || 0,
            retweets: tweet.retweets || 0,
            replies: tweet.replies || 0
          })
        }
      })
      savedTweets.push(savedTweet)
    } catch (error) {
      console.error('Error saving tweet:', error)
      // Continue with other tweets even if one fails
    }
  }
  
  return savedTweets
}

async function saveAnalysisToDatabase(userId: string, analysis: any) {
  return await prisma.userStyleAnalysis.create({
    data: {
      userId,
      analysis: JSON.stringify(analysis),
      confidence: analysis.confidence || 0.8,
      tweetCount: analysis.totalTweets || 0
    }
  })
}