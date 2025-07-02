// RapidAPI Twitter v23 integration
interface RapidApiConfig {
  apiKey: string
  host: string
}

interface RapidApiTweet {
  rest_id: string
  legacy: {
    full_text: string
    created_at: string
    favorite_count: number
    retweet_count: number
    reply_count: number
    user_id_str: string
  }
  core?: {
    user_results?: {
      result?: {
        legacy?: {
          screen_name: string
        }
      }
    }
  }
}

interface RapidApiUser {
  data: {
    user: {
      result: {
        rest_id: string
        legacy: {
          screen_name: string
          name: string
          followers_count: number
          friends_count: number
          statuses_count: number
          verified: boolean
        }
      }
    }
  }
}

export class RapidApiTwitterClient {
  private config: RapidApiConfig

  constructor() {
    this.config = {
      apiKey: process.env.RAPIDAPI_KEY || '',
      host: 'twitter-v23.p.rapidapi.com'
    }
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(`https://${this.config.host}${endpoint}`)
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value)
    })

    console.log(`🔗 RapidAPI Twitter v23 request: ${endpoint}`)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': this.config.apiKey,
        'X-RapidAPI-Host': this.config.host,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`RapidAPI Error (${response.status}):`, errorText)
      throw new Error(`RapidAPI error: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  async getUserByScreenName(username: string): Promise<any | null> {
    try {
      console.log(`🔍 RapidAPI: Getting user info for @${username}`)
      
      const response = await this.makeRequest('/user-by-screen-name', {
        username: username.replace('@', '')
      })

      if (response?.data?.user?.result) {
        const userData = response.data.user.result
        console.log(`✅ RapidAPI: Found user @${username}`)
        return {
          id: userData.rest_id,
          username: userData.legacy.screen_name,
          name: userData.legacy.name,
          verified: userData.legacy.verified,
          followers_count: userData.legacy.followers_count,
          friends_count: userData.legacy.friends_count,
          statuses_count: userData.legacy.statuses_count
        }
      }

      return null
    } catch (error) {
      console.error(`❌ RapidAPI: Failed to get user @${username}:`, error)
      return null
    }
  }

  async getUserTweets(username: string, options: {
    maxResults?: number
    cursor?: string
  } = {}): Promise<{ tweets: any[], cursor?: string }> {
    try {
      const { maxResults = 20 } = options
      
      console.log(`🔍 RapidAPI: Getting tweets for @${username}`)
      
      const params: Record<string, string> = {
        username: username.replace('@', ''),
        count: maxResults.toString()
      }

      if (options.cursor) {
        params.cursor = options.cursor
      }

      const response = await this.makeRequest('/user-tweets', params)

      if (response?.data?.user?.result?.timeline_v2?.timeline?.instructions) {
        const instructions = response.data.user.result.timeline_v2.timeline.instructions
        const tweets: any[] = []
        let nextCursor: string | undefined

        // Extract tweets from timeline instructions
        for (const instruction of instructions) {
          if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
            for (const entry of instruction.entries) {
              if (entry.content?.entryType === 'TimelineTimelineItem' && 
                  entry.content?.itemContent?.tweet_results?.result?.legacy) {
                
                const tweetData = entry.content.itemContent.tweet_results.result
                const legacy = tweetData.legacy
                
                // Skip retweets and replies
                if (legacy.full_text.startsWith('RT @') || legacy.full_text.startsWith('@')) {
                  continue
                }
                
                tweets.push({
                  rest_id: tweetData.rest_id,
                  legacy: {
                    full_text: legacy.full_text,
                    created_at: legacy.created_at,
                    favorite_count: legacy.favorite_count || 0,
                    retweet_count: legacy.retweet_count || 0,
                    reply_count: legacy.reply_count || 0
                  }
                })
              } else if (entry.content?.entryType === 'TimelineTimelineCursor' && 
                        entry.content?.value && 
                        entry.content?.cursorType === 'Bottom') {
                nextCursor = entry.content.value
              }
            }
          }
        }

        console.log(`✅ RapidAPI: Found ${tweets.length} tweets for @${username}`)
        return { tweets, cursor: nextCursor }
      }

      return { tweets: [] }
    } catch (error) {
      console.error(`❌ RapidAPI: Failed to get tweets for @${username}:`, error)
      return { tweets: [] }
    }
  }

  async getMultipleUsersTweets(
    usernames: string[],
    maxTweetsPerUser: number = 10
  ): Promise<Array<{ username: string, userId: string, tweets: any[], error?: string }>> {
    const results = []

    console.log(`🚀 RapidAPI Twitter v23: Fetching tweets for ${usernames.length} users`)

    for (const username of usernames) {
      try {
        const cleanUsername = username.replace('@', '')
        
        // Get user info first
        const user = await this.getUserByScreenName(cleanUsername)
        if (!user) {
          results.push({
            username: cleanUsername,
            userId: '',
            tweets: [],
            error: 'User not found'
          })
          continue
        }

        // Get user tweets
        const tweetsResponse = await this.getUserTweets(cleanUsername, {
          maxResults: maxTweetsPerUser
        })

        // Convert to our format
        const convertedTweets = tweetsResponse.tweets
          .filter(tweet => {
            // Additional filtering for quality
            const text = tweet.legacy.full_text
            if (text.length < 20) return false
            if (text.startsWith('RT @')) return false
            if (text.startsWith('@')) return false
            return true
          })
          .slice(0, maxTweetsPerUser)
          .map(tweet => ({
            tweetId: tweet.rest_id,
            content: tweet.legacy.full_text,
            authorUsername: user.username,
            authorId: user.id,
            publishedAt: new Date(tweet.legacy.created_at).toISOString(),
            likeCount: tweet.legacy.favorite_count,
            replyCount: tweet.legacy.reply_count || 0,
            retweetCount: tweet.legacy.retweet_count,
            sentimentScore: this.analyzeSentiment(tweet.legacy.full_text),
            isDeleted: false,
            scrapedAt: new Date().toISOString(),
          }))

        console.log(`✅ RapidAPI: Got ${convertedTweets.length} tweets for @${cleanUsername}`)

        results.push({
          username: cleanUsername,
          userId: user.id,
          tweets: convertedTweets
        })

        // Rate limiting delay - be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ RapidAPI: Failed to fetch tweets for ${username}:`, error)
        results.push({
          username: username.replace('@', ''),
          userId: '',
          tweets: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  // Simple sentiment analysis
  private analyzeSentiment(text: string): number {
    const positiveWords = ['good', 'great', 'awesome', 'amazing', 'excellent', 'love', 'perfect', 'wonderful', 'fantastic', 'brilliant', 'excited', 'happy', 'success', 'win', 'best']
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'worst', 'disappointing', 'annoying', 'frustrating', 'useless', 'fail', 'broken', 'sad', 'angry', 'problem']
    
    const words = text.toLowerCase().split(/\s+/)
    let score = 0
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1
      if (negativeWords.includes(word)) score -= 1
    })
    
    return Math.max(-1, Math.min(1, score / Math.max(words.length, 1) * 5))
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 Testing RapidAPI Twitter v23 connection...')
      
      // Try to get a well-known user
      const testUser = await this.getUserByScreenName('elonmusk')
      
      if (testUser) {
        return {
          success: true,
          message: `RapidAPI connection successful. Found user: @${testUser.username}`
        }
      } else {
        return {
          success: false,
          message: 'RapidAPI connection failed - no data returned'
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `RapidAPI connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

export const rapidApiTwitterClient = new RapidApiTwitterClient()