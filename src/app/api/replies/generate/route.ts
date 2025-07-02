import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

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

    // For now, generate a simple reply based on sentiment and content
    // This will be replaced with OpenAI integration later
    const reply = generateSimpleReply(tweetContent, targetUsername, context)

    return NextResponse.json({
      reply,
      tweetId,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error generating reply:', error)
    return NextResponse.json(
      { error: 'Failed to generate reply' },
      { status: 500 }
    )
  }
}

function generateSimpleReply(tweetContent: string, targetUsername: string, context: any): string {
  const sentiment = context?.sentiment || 0
  const authorUsername = context?.authorUsername || targetUsername

  // Simple reply templates based on sentiment and content keywords
  const positiveReplies = [
    `Congratulations @${authorUsername}! This is fantastic news. Wishing you continued success! 🎉`,
    `Love seeing this progress @${authorUsername}! Keep up the great work!`,
    `This is inspiring @${authorUsername}! Thanks for sharing your journey with us.`,
    `Exciting times ahead @${authorUsername}! Looking forward to seeing what's next.`,
    `Amazing achievement @${authorUsername}! Your dedication is truly paying off.`
  ]

  const neutralReplies = [
    `Interesting perspective @${authorUsername}. Thanks for sharing your insights on this.`,
    `Great point @${authorUsername}. This really resonates with my experience as well.`,
    `Thanks for sharing this @${authorUsername}. Always valuable to hear different viewpoints.`,
    `Appreciate you posting about this @${authorUsername}. Food for thought indeed.`,
    `Solid insights @${authorUsername}. This adds great value to the conversation.`
  ]

  const negativeReplies = [
    `I understand your frustration @${authorUsername}. Have you considered trying a different approach?`,
    `Sorry to hear about this challenge @${authorUsername}. Every setback is a learning opportunity.`,
    `Tough situation @${authorUsername}. Sometimes the best solutions come from difficult moments.`,
    `I feel you @${authorUsername}. These challenges are what make us stronger in the end.`,
    `Hang in there @${authorUsername}. Every entrepreneur faces these kinds of obstacles.`
  ]

  let replyArray = neutralReplies
  if (sentiment > 0.3) {
    replyArray = positiveReplies
  } else if (sentiment < -0.2) {
    replyArray = negativeReplies
  }

  // Add specific responses for certain keywords
  if (tweetContent.toLowerCase().includes('ai') || tweetContent.toLowerCase().includes('automation')) {
    replyArray = [
      `The AI space is evolving so quickly @${authorUsername}! Exciting to see how it's transforming businesses.`,
      `Automation really is changing the game @${authorUsername}. Thanks for sharing your perspective.`,
      `AI has so much potential @${authorUsername}. What's been your biggest learning so far?`
    ]
  }

  if (tweetContent.toLowerCase().includes('startup') || tweetContent.toLowerCase().includes('founder')) {
    replyArray = [
      `The startup journey is incredible @${authorUsername}! Every day brings new challenges and opportunities.`,
      `Being a founder requires such resilience @${authorUsername}. Appreciate you sharing your experience.`,
      `The startup ecosystem needs more voices like yours @${authorUsername}. Keep sharing your insights!`
    ]
  }

  // Return a random reply from the appropriate array
  return replyArray[Math.floor(Math.random() * replyArray.length)]
}