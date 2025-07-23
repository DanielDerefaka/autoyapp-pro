import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { rapidApiTwitterClient } from '@/lib/rapidapi-twitter'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    const clerkId = userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { username, count = 50 } = await request.json()
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Fetch tweets using the same RapidAPI client as target users
    console.log(`🚀 Fetching tweets for user @${username} using RapidAPI`)
    const tweetsResponse = await rapidApiTwitterClient.getUserTweets(username, { maxResults: count })
    
    if (!tweetsResponse.tweets || tweetsResponse.tweets.length === 0) {
      return NextResponse.json({ error: 'No tweets found for this user or user does not exist' }, { status: 404 })
    }

    // Convert RapidAPI format to our format
    const tweets = tweetsResponse.tweets.map(tweet => ({
      id: tweet.rest_id,
      content: tweet.legacy.full_text,
      timestamp: new Date(tweet.legacy.created_at).toISOString(),
      likes: tweet.legacy.favorite_count || 0,
      retweets: tweet.legacy.retweet_count || 0,
      replies: tweet.legacy.reply_count || 0,
      author: {
        username: username.replace('@', ''),
        name: username.replace('@', '')
      }
    }))

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

    // Store the fetched tweets
    const savedTweets = await saveFetchedTweets(user.id, tweets, username)

    return NextResponse.json({
      success: true,
      message: `Fetched ${tweets.length} tweets for @${username}`,
      tweets: tweets.slice(0, 10), // Return first 10 for preview
      totalFetched: tweets.length,
      totalSaved: savedTweets.length,
      username
    })
  } catch (error) {
    console.error('Error fetching user tweets:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch tweets',
      details: error.message 
    }, { status: 500 })
  }
}


async function saveFetchedTweets(userId: string, tweets: any[], username: string) {
  const savedTweets = []
  
  for (const tweet of tweets) {
    try {
      // Check if tweet already exists
      const existingTweet = await prisma.userTweet.findFirst({
        where: {
          userId,
          originalId: tweet.id
        }
      })

      if (existingTweet) {
        continue // Skip duplicates
      }

      const savedTweet = await prisma.userTweet.create({
        data: {
          userId,
          content: tweet.content,
          originalId: tweet.id,
          source: 'rapidapi',
          metadata: JSON.stringify({
            timestamp: tweet.timestamp,
            likes: tweet.likes,
            retweets: tweet.retweets,
            replies: tweet.replies,
            author: tweet.author,
            fetchedFrom: username.replace('@', ''),
            realData: true // Mark as real data, not mock
          })
        }
      })
      savedTweets.push(savedTweet)
    } catch (error) {
      console.error('Error saving fetched tweet:', error)
      // Continue with other tweets
    }
  }
  
  return savedTweets
}