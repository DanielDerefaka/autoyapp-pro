import crypto from 'crypto'
// import { XScraper, ScrapeResult } from './scraper'
// import { scrapeLimiter } from './scrape-limiter'
// import { AlternativeDataSources } from './alternative-sources'
import { rapidApiTwitterClient } from './rapidapi-twitter'
import { TwitterRateLimits } from './rate-limiter'

interface XApiConfig {
  apiKey: string
  apiSecret: string
  bearerToken: string
  clientId?: string
  clientSecret?: string
}

interface XUser {
  id: string
  username: string
  name: string
  verified: boolean
  public_metrics: {
    followers_count: number
    following_count: number
    tweet_count: number
    listed_count: number
  }
}

interface XTweet {
  id: string
  text: string
  author_id: string
  created_at: string
  public_metrics: {
    retweet_count: number
    like_count: number
    reply_count: number
    quote_count: number
  }
  context_annotations?: Array<{
    domain: {
      id: string
      name: string
      description: string
    }
    entity: {
      id: string
      name: string
      description: string
    }
  }>
  referenced_tweets?: Array<{
    type: string
    id: string
  }>
}

export class XApiClient {
  private config: XApiConfig
  private baseUrl = 'https://api.twitter.com/2'

  constructor(config: XApiConfig) {
    this.config = config
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
    accessToken?: string
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    }

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    } else {
      headers.Authorization = `Bearer ${this.config.bearerToken}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`X API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  async getUserByUsername(username: string): Promise<XUser> {
    const response = await this.makeRequest(
      `/users/by/username/${username}?user.fields=verified,public_metrics`
    )
    return response.data
  }

  async getUserTweets(
    userId: string,
    options: {
      maxResults?: number
      sinceId?: string
      accessToken?: string
      excludeReplies?: boolean
      excludeRetweets?: boolean
    } = {}
  ): Promise<{ data: XTweet[]; meta: any }> {
    const { 
      maxResults = 10, 
      sinceId, 
      accessToken,
      excludeReplies = true,
      excludeRetweets = true 
    } = options
    
    let endpoint = `/users/${userId}/tweets?tweet.fields=created_at,public_metrics,context_annotations,referenced_tweets&max_results=${maxResults}`
    
    // Add excludes to filter out replies and retweets
    const excludes = []
    if (excludeReplies) excludes.push('replies')
    if (excludeRetweets) excludes.push('retweets')
    
    if (excludes.length > 0) {
      endpoint += `&exclude=${excludes.join(',')}`
    }
    
    if (sinceId) {
      endpoint += `&since_id=${sinceId}`
    }

    const response = await this.makeRequest(endpoint, {}, accessToken)
    return response
  }

  async uploadMedia(
    imageBuffer: Buffer,
    mimeType: string,
    accessToken: string
  ): Promise<{ media_id_string: string }> {
    console.log(`🖼️ Starting media upload - Size: ${imageBuffer.length} bytes, Type: ${mimeType}`)
    
    try {
      // Use proper form data for media upload
      const formData = new URLSearchParams()
      formData.append('media_data', imageBuffer.toString('base64'))
      formData.append('media_category', 'tweet_image')

      const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Media upload failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        throw new Error(`Media upload failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log(`✅ Media uploaded successfully: ${result.media_id_string}`)
      return result
    } catch (error) {
      console.error('❌ Media upload error:', error)
      throw error
    }
  }

  async postTweet(
    text: string,
    options: {
      replyToTweetId?: string
      accessToken: string
      mediaIds?: string[]
      userId?: string
    }
  ): Promise<{ data: { id: string; text: string } }> {
    return TwitterRateLimits.postTweet(async () => {
      const body: any = { text }
      
      if (options.replyToTweetId) {
        body.reply = {
          in_reply_to_tweet_id: options.replyToTweetId
        }
      }

      if (options.mediaIds && options.mediaIds.length > 0) {
        body.media = {
          media_ids: options.mediaIds
        }
      }

      // Use OAuth 2.0 User Context for posting tweets
      const url = `${this.baseUrl}/tweets`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.accessToken}` // User access token
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('X API Error Response:', error)
        
        // Create error object with status and headers for rate limiting
        const apiError = new Error(`X API error: ${response.status} - ${error}`) as any;
        apiError.status = response.status;
        apiError.headers = Object.fromEntries(response.headers.entries());
        
        throw apiError;
      }

      return response.json()
    }, options.userId);
  }

  async deleteTweet(
    tweetId: string,
    accessToken: string
  ): Promise<{ data: { deleted: boolean } }> {
    const response = await this.makeRequest(
      `/tweets/${tweetId}`,
      { method: 'DELETE' },
      accessToken
    )
    return response
  }

  // Analyze sentiment (simple keyword-based for now)
  analyzeSentiment(text: string): number {
    const positiveWords = ['great', 'amazing', 'excellent', 'love', 'awesome', 'fantastic', 'wonderful', 'perfect', 'success', 'excited', 'happy', 'thrilled', 'congratulations', 'proud', 'achievement', 'breakthrough', 'victory', 'winning', 'launched', 'milestone', 'growth']
    const negativeWords = ['terrible', 'awful', 'hate', 'horrible', 'worst', 'failed', 'failure', 'disaster', 'frustrated', 'angry', 'sad', 'disappointed', 'difficult', 'problem', 'issue', 'struggle', 'challenge', 'broken', 'stuck', 'blocked']

    const words = text.toLowerCase().split(/\s+/)
    let score = 0

    words.forEach(word => {
      if (positiveWords.some(pos => word.includes(pos))) score += 1
      if (negativeWords.some(neg => word.includes(neg))) score -= 1
    })

    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, score / Math.max(words.length, 1) * 5))
  }

  // Get tweets for multiple users (target users)
  async getTargetUsersTweets(
    usernames: string[],
    options: {
      maxTweetsPerUser?: number
      sinceId?: string
      accessToken?: string
      hours?: number // Get tweets from last X hours
      fallbackToScraping?: boolean // Enable fallback scraping
    } = {}
  ): Promise<Array<{ username: string, userId: string, tweets: any[], error?: string }>> {
    const { maxTweetsPerUser = 10, sinceId, accessToken, hours = 24, fallbackToScraping = true } = options
    const results = []
    const failedUsers: string[] = []

    console.log(`🚀 Fetching tweets for ${usernames.length} users via X API...`)

    for (const username of usernames) {
      try {
        const cleanUsername = username.replace('@', '')
        
        // Get user info first
        const userResponse = await this.getUserByUsername(cleanUsername)
        if (!userResponse) {
          console.log(`❌ User not found via API: ${cleanUsername}`)
          failedUsers.push(cleanUsername)
          continue
        }

        // Get user's tweets (exclude replies and retweets to get only original posts)
        const tweetsResponse = await this.getUserTweets(userResponse.id, {
          maxResults: maxTweetsPerUser,
          sinceId,
          accessToken,
          excludeReplies: true,
          excludeRetweets: true
        })

        // Convert and enhance tweets, filtering out replies and quote tweets
        const enhancedTweets = (tweetsResponse.data || [])
          .filter(tweet => {
            // Additional filtering to ensure we only get original content
            // Skip tweets that start with @ (replies that somehow got through)
            if (tweet.text.trim().startsWith('@')) return false
            
            // Skip tweets with referenced_tweets (quotes, replies, retweets)
            if (tweet.referenced_tweets && tweet.referenced_tweets.length > 0) return false
            
            // Skip very short tweets (likely not substantial content)
            if (tweet.text.trim().length < 20) return false
            
            return true
          })
          .map(tweet => ({
            tweetId: tweet.id,
            content: tweet.text,
            authorUsername: userResponse.username,
            authorId: tweet.author_id,
            publishedAt: new Date(tweet.created_at).toISOString(),
            likeCount: tweet.public_metrics.like_count,
            replyCount: tweet.public_metrics.reply_count,
            retweetCount: tweet.public_metrics.retweet_count,
            sentimentScore: this.analyzeSentiment(tweet.text),
            isDeleted: false,
            scrapedAt: new Date().toISOString(),
          }))

        console.log(`✅ API: Fetched ${enhancedTweets.length} tweets for @${cleanUsername}`)
        results.push({
          username: cleanUsername,
          userId: userResponse.id,
          tweets: enhancedTweets
        })

        // Rate limiting delay (300 requests per 15 min window)
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`❌ API failed for ${username}:`, error)
        
        // Check if it's a rate limit error
        const isRateLimited = error instanceof Error && 
          (error.message.includes('429') || error.message.includes('Too Many Requests'))
        
        if (isRateLimited && fallbackToScraping) {
          console.log(`🕷️  Rate limited for ${username}, will try scraping...`)
          failedUsers.push(username.replace('@', ''))
        } else {
          results.push({
            username: username.replace('@', ''),
            userId: '',
            tweets: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    // If we have failed users, try RapidAPI first
    if (failedUsers.length > 0) {
      const enableRapidAPI = process.env.ENABLE_RAPIDAPI === 'true' && process.env.RAPIDAPI_KEY
      
      // Try RapidAPI first if enabled
      if (enableRapidAPI) {
        console.log(`🚀 Trying RapidAPI for ${failedUsers.length} failed users...`)
        try {
          const rapidApiResults = await rapidApiTwitterClient.getMultipleUsersTweets(failedUsers, maxTweetsPerUser)
          
          // Process RapidAPI results
          for (const rapidResult of rapidApiResults) {
            if (rapidResult.tweets.length > 0) {
              console.log(`✅ RapidAPI: Got ${rapidResult.tweets.length} tweets for @${rapidResult.username}`)
              
              // Convert to our format
              const convertedTweets = rapidResult.tweets.map(tweet => ({
                tweetId: tweet.tweetId,
                content: tweet.content,
                authorUsername: tweet.authorUsername,
                authorId: tweet.authorId,
                publishedAt: tweet.publishedAt,
                likeCount: tweet.likeCount,
                replyCount: tweet.replyCount,
                retweetCount: tweet.retweetCount,
                sentimentScore: tweet.sentimentScore || this.analyzeSentiment(tweet.content),
                isDeleted: false,
                scrapedAt: tweet.scrapedAt,
              }))
              
              results.push({
                username: rapidResult.username,
                userId: rapidResult.userId,
                tweets: convertedTweets
              })
              
              // Remove from failed users list
              const index = failedUsers.indexOf(rapidResult.username)
              if (index > -1) failedUsers.splice(index, 1)
            }
          }
        } catch (rapidError) {
          console.error('❌ RapidAPI failed:', rapidError)
        }
      }

      // Add failed results for remaining users that couldn't be fetched
      for (const username of failedUsers) {
        results.push({
          username: username.replace('@', ''),
          userId: '',
          tweets: [],
          error: 'X API rate limited, RapidAPI also failed or disabled'
        })
      }
    }

    console.log(`🎯 Final results: ${results.length} users processed, ${results.filter(r => r.tweets.length > 0).length} successful`)
    return results
  }

  // OAuth 2.0 methods
  generateOAuthUrl(redirectUri: string, state: string) {
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId!,
      redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    return {
      authUrl: `https://twitter.com/i/oauth2/authorize?${params.toString()}`,
      codeVerifier
    }
  }

  async exchangeCodeForToken(code: string, redirectUri: string, codeVerifier: string) {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId!,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    })

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${this.config.clientId}:${this.config.clientSecret}`
        ).toString('base64')}`,
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OAuth token exchange failed: ${error}`)
    }

    return response.json()
  }

  async refreshToken(refreshToken: string, userId?: string) {
    // Token refresh doesn't typically have the same rate limits, but we'll add light protection
    return TwitterRateLimits.lookupUser(async () => {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId!,
      })

      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${this.config.clientId}:${this.config.clientSecret}`
          ).toString('base64')}`,
        },
        body: params.toString(),
      })

      if (!response.ok) {
        const error = await response.text()
        const apiError = new Error(`Token refresh failed: ${error}`) as any;
        apiError.status = response.status;
        apiError.headers = Object.fromEntries(response.headers.entries());
        throw apiError;
      }

      return response.json()
    }, userId);
  }
}

export const xApiClient = new XApiClient({
  apiKey: process.env.X_API_KEY!,
  apiSecret: process.env.X_API_SECRET!,
  bearerToken: process.env.X_BEARER_TOKEN!,
  clientId: process.env.X_CLIENT_ID!,
  clientSecret: process.env.X_CLIENT_SECRET!,
})