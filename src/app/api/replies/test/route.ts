import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { ViralStylesManager } from '@/lib/viral-styles'
import { viralReplyGenerator } from '@/lib/viral-reply-generator'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    const clerkId = userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tweetContent, styles } = await request.json()
    
    if (!tweetContent) {
      return NextResponse.json({ error: 'Tweet content is required' }, { status: 400 })
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

    console.log(`🧪 Testing AI reply for: "${tweetContent.substring(0, 50)}..."`)

    try {
      // Use the enhanced viral reply generator with user's personal style
      const viralReply = await viralReplyGenerator.generateViralReply({
        tweetContent,
        authorUsername: 'testuser', // Generic for testing
        userStyles: styles, // Use the styles from the test request
        userId: user.id, // This will fetch personal style analysis if available
        context: {
          sentiment: 0, // Neutral for testing
        },
        viralStrategy: 'auto'
      })

      return NextResponse.json({
        reply: viralReply.content,
        viralScore: viralReply.viralScore,
        strategy: viralReply.strategy,
        confidence: viralReply.confidence,
        reasoning: viralReply.reasoning,
        optimizedFor: viralReply.optimizedFor,
        psychology: {
          hooks: viralReply.hooks,
          triggers: viralReply.psychologyTriggers
        },
        testMode: true,
        generatedAt: new Date().toISOString()
      })

    } catch (viralError) {
      console.log('Viral system failed, using fallback:', viralError)
      
      // Fallback to basic reply generation
      const fallbackReply = generateTestReply(tweetContent, styles)
      
      return NextResponse.json({
        reply: fallbackReply,
        viralScore: 0.65,
        strategy: 'fallback',
        confidence: 0.6,
        reasoning: 'Using fallback reply generation due to system error',
        optimizedFor: 'basic engagement',
        testMode: true,
        fallback: true,
        generatedAt: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error generating test reply:', error)
    
    // Final fallback
    return NextResponse.json({
      reply: "This is really interesting! Thanks for sharing your perspective on this.",
      viralScore: 0.5,
      strategy: 'emergency-fallback',
      confidence: 0.4,
      reasoning: 'Emergency fallback due to system error',
      testMode: true,
      error: true,
      generatedAt: new Date().toISOString()
    })
  }
}

function generateTestReply(tweetContent: string, styles: any): string {
  const content = tweetContent.toLowerCase()
  
  // Generate contextual replies based on content and user styles
  let baseReply = ''
  
  if (content.includes('ai') || content.includes('artificial intelligence')) {
    baseReply = "The AI revolution is fascinating! What's your take on how this will impact the industry?"
  } else if (content.includes('startup') || content.includes('business')) {
    baseReply = "This resonates with the entrepreneurial journey. Every founder can relate to this experience."
  } else if (content.includes('product') || content.includes('launch')) {
    baseReply = "Product launches are always exciting! The execution details make all the difference."
  } else if (content.includes('team') || content.includes('hiring')) {
    baseReply = "Building great teams is an art. Culture and talent alignment are everything."
  } else if (content.includes('marketing') || content.includes('growth')) {
    baseReply = "Growth strategies like this are gold. The data-driven approach really shows."
  } else if (content.includes('?')) {
    baseReply = "Great question! This really makes you think about the broader implications."
  } else {
    baseReply = "This is a valuable insight. Really adds depth to the conversation."
  }
  
  // Adjust reply based on user's style preferences
  if (styles) {
    switch (styles.tone) {
      case 'enthusiastic':
        baseReply = baseReply.replace('.', '! 🚀')
        break
      case 'casual':
        baseReply = baseReply.replace('This is', 'This is really').replace('Great', 'Great')
        break
      case 'thoughtful':
        baseReply = baseReply + ' What are your thoughts on the long-term implications?'
        break
      case 'professional':
        // Keep it professional (default)
        break
    }
    
    // Adjust length based on preference
    if (styles.length === 'short' && baseReply.length > 100) {
      baseReply = baseReply.split('.')[0] + '.'
    } else if (styles.length === 'long' && baseReply.length < 120) {
      baseReply += ' Would love to hear more about your experience with this.'
    }
  }
  
  return baseReply
}