import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const sampleTweets = [
  {
    content: "Just launched our new AI product! Excited to see how it performs in the market. The future of automation is here! 🚀 #AI #ProductLaunch",
    authorUsername: "techfounder",
    likeCount: 45,
    replyCount: 12,
    retweetCount: 8,
    sentimentScore: 0.7
  },
  {
    content: "Working late again tonight. Building a startup is harder than I thought, but every challenge makes us stronger. 💪",
    authorUsername: "entrepreneur_jane",
    likeCount: 23,
    replyCount: 5,
    retweetCount: 3,
    sentimentScore: 0.2
  },
  {
    content: "Really frustrated with the current state of customer service automation. Most chatbots are terrible and provide no real value. 😤",
    authorUsername: "saas_critic",
    likeCount: 67,
    replyCount: 28,
    retweetCount: 15,
    sentimentScore: -0.6
  },
  {
    content: "Just closed our Series A! $5M to accelerate our AI platform. Thank you to all our investors and team. This is just the beginning! 🎉",
    authorUsername: "startup_ceo",
    likeCount: 156,
    replyCount: 42,
    retweetCount: 67,
    sentimentScore: 0.9
  },
  {
    content: "The key to scaling any SaaS business is understanding your customer lifecycle. Retention > Acquisition every time.",
    authorUsername: "growth_expert",
    likeCount: 89,
    replyCount: 31,
    retweetCount: 45,
    sentimentScore: 0.1
  },
  {
    content: "Another day, another failed product demo. Sometimes I wonder if we're building the right thing. Market fit is everything.",
    authorUsername: "product_manager",
    likeCount: 34,
    replyCount: 18,
    retweetCount: 7,
    sentimentScore: -0.3
  },
  {
    content: "Machine learning is revolutionizing how we approach customer segmentation. Our new model increased conversion by 40%! 📊",
    authorUsername: "data_scientist",
    likeCount: 92,
    replyCount: 19,
    retweetCount: 26,
    sentimentScore: 0.6
  },
  {
    content: "Hot take: Most 'AI-powered' tools are just basic automation with fancy marketing. Real AI requires real understanding.",
    authorUsername: "ai_researcher",
    likeCount: 78,
    replyCount: 54,
    retweetCount: 23,
    sentimentScore: -0.1
  }
]

export async function POST() {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        targetUsers: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.targetUsers.length === 0) {
      return NextResponse.json({ error: 'No target users found. Add target users first.' }, { status: 400 })
    }

    // Create sample tweets for existing target users
    const createdTweets = []
    
    for (let i = 0; i < sampleTweets.length; i++) {
      const sampleTweet = sampleTweets[i]
      const targetUser = user.targetUsers[i % user.targetUsers.length]
      
      // Check if tweet already exists to avoid duplicates
      const existingTweet = await prisma.tweet.findFirst({
        where: {
          content: sampleTweet.content,
          targetUserId: targetUser.id
        }
      })

      if (!existingTweet) {
        const tweet = await prisma.tweet.create({
          data: {
            tweetId: `sample_${Date.now()}_${i}`,
            targetUserId: targetUser.id,
            content: sampleTweet.content,
            authorUsername: sampleTweet.authorUsername,
            publishedAt: new Date(Date.now() - (i * 2 * 60 * 60 * 1000)), // Spread over last 16 hours
            likeCount: sampleTweet.likeCount,
            replyCount: sampleTweet.replyCount,
            retweetCount: sampleTweet.retweetCount,
            sentimentScore: sampleTweet.sentimentScore,
            scrapedAt: new Date(),
          }
        })
        createdTweets.push(tweet)
      }
    }

    return NextResponse.json({
      message: `Created ${createdTweets.length} sample tweets`,
      tweets: createdTweets
    })
  } catch (error) {
    console.error('Error creating sample tweets:', error)
    return NextResponse.json(
      { error: 'Failed to create sample tweets' },
      { status: 500 }
    )
  }
}