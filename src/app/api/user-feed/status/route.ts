import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()
    const clerkId = userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId }
    })

    if (!user) {
      return NextResponse.json({
        hasPersonalAnalysis: false,
        hasTweets: false,
        message: 'User not found'
      })
    }

    // Check for personal style analysis
    const latestAnalysis = await prisma.userStyleAnalysis.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    // Check for user tweets
    const tweetCount = await prisma.userTweet.count({
      where: { userId: user.id }
    })

    return NextResponse.json({
      hasPersonalAnalysis: !!latestAnalysis,
      hasTweets: tweetCount > 0,
      tweetCount,
      analysisDate: latestAnalysis?.createdAt || null,
      confidence: latestAnalysis?.confidence || 0,
      message: latestAnalysis 
        ? `Personal style analysis available (${tweetCount} tweets analyzed on ${latestAnalysis.createdAt.toDateString()})`
        : tweetCount > 0
        ? `${tweetCount} tweets stored but not analyzed yet. Visit /user-feed to analyze.`
        : 'No tweets analyzed yet. Visit /user-feed to get started.'
    })
  } catch (error) {
    console.error('Error checking user feed status:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}