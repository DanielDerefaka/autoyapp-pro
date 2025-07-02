import { chromium, Browser, Page } from 'playwright'
import UserAgent from 'user-agents'

export interface ScrapedTweet {
  tweetId: string
  content: string
  authorUsername: string
  publishedAt: string
  likeCount: number
  replyCount: number
  retweetCount: number
  sentimentScore?: number
  scrapedAt: string
}

export interface ScrapeResult {
  username: string
  userId: string
  tweets: ScrapedTweet[]
  error?: string
}

export class XScraper {
  private browser: Browser | null = null
  private page: Page | null = null
  
  constructor() {}

  async init(): Promise<void> {
    try {
      console.log('🤖 Initializing web scraper...')
      
      // Launch browser with stealth mode
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
        ],
      })

      // Create new page with random user agent
      this.page = await this.browser.newPage({
        userAgent: new UserAgent().toString(),
        viewport: { width: 1366, height: 768 },
      })

      // Add stealth scripts
      await this.page.addInitScript(() => {
        // Override webdriver detection
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        })

        // Override chrome runtime
        window.chrome = {
          runtime: {},
        }

        // Override permissions
        const originalQuery = window.navigator.permissions.query
        return originalQuery({
          name: 'notifications',
        })
      })

      console.log('✅ Web scraper initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize scraper:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close()
      this.page = null
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
    console.log('🔒 Web scraper closed')
  }

  private async randomDelay(min: number = 2000, max: number = 5000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    console.log(`⏱️  Waiting ${delay}ms to mimic human behavior...`)
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  private async handleRateLimit(): Promise<void> {
    const backoffTime = 15 * 60 * 1000 // 15 minutes
    console.log(`🚫 Rate limit detected, backing off for ${backoffTime / 1000 / 60} minutes...`)
    await new Promise(resolve => setTimeout(resolve, backoffTime))
  }

  async scrapeUserTweets(username: string, maxTweets: number = 10, retryCount: number = 0): Promise<ScrapeResult> {
    if (!this.page) {
      throw new Error('Scraper not initialized. Call init() first.')
    }

    const maxRetries = 2
    console.log(`🔍 Scraping tweets for @${username}... (attempt ${retryCount + 1}/${maxRetries + 1})`)
    
    try {
      // Navigate to user profile
      const profileUrl = `https://x.com/${username}`
      console.log(`📍 Navigating to ${profileUrl}`)
      
      const response = await this.page.goto(profileUrl, { 
        waitUntil: 'networkidle',
        timeout: 45000 
      })

      // Check for rate limiting or blocking
      if (response?.status() === 429) {
        console.log(`🚫 Rate limited while accessing @${username}`)
        if (retryCount < maxRetries) {
          await this.handleRateLimit()
          return this.scrapeUserTweets(username, maxTweets, retryCount + 1)
        } else {
          return {
            username,
            userId: '',
            tweets: [],
            error: 'Rate limited after multiple retries'
          }
        }
      }

      await this.randomDelay(3000, 8000) // Longer delay after navigation

      // Check if we hit a rate limit page
      const rateLimitIndicators = [
        'Rate limit exceeded',
        'Try again later',
        'Something went wrong',
        'rate limit'
      ]
      
      const pageContent = await this.page.content()
      const isRateLimited = rateLimitIndicators.some(indicator => 
        pageContent.toLowerCase().includes(indicator.toLowerCase())
      )
      
      if (isRateLimited) {
        console.log(`🚫 Rate limit page detected for @${username}`)
        if (retryCount < maxRetries) {
          await this.handleRateLimit()
          return this.scrapeUserTweets(username, maxTweets, retryCount + 1)
        } else {
          return {
            username,
            userId: '',
            tweets: [],
            error: 'Rate limited - detected rate limit page'
          }
        }
      }

      // Check if profile exists
      const profileExists = await this.page.locator('[data-testid="primaryColumn"]').count() > 0
      if (!profileExists) {
        return {
          username,
          userId: '',
          tweets: [],
          error: 'Profile not found or private'
        }
      }

      // Get user ID from profile (if available)
      let userId = ''
      try {
        const userIdElement = await this.page.locator('[data-testid="UserProfileHeader_Items"] a[href*="/"]').first()
        const href = await userIdElement.getAttribute('href')
        if (href) {
          userId = href.split('/').pop() || ''
        }
      } catch (e) {
        console.log('Could not extract user ID, using username')
        userId = username
      }

      // Scroll and collect tweets
      const tweets: ScrapedTweet[] = []
      let scrollAttempts = 0
      const maxScrolls = 5

      while (tweets.length < maxTweets && scrollAttempts < maxScrolls) {
        console.log(`📜 Scroll attempt ${scrollAttempts + 1}, collected ${tweets.length} tweets`)

        // Look for tweet articles
        const tweetElements = await this.page.locator('[data-testid="tweet"]').all()
        
        for (const tweet of tweetElements) {
          if (tweets.length >= maxTweets) break

          try {
            // Extract tweet data
            const tweetData = await this.extractTweetData(tweet, username)
            if (tweetData && !tweets.find(t => t.tweetId === tweetData.tweetId)) {
              tweets.push(tweetData)
            }
          } catch (e) {
            console.log('Error extracting tweet data:', e)
            continue
          }
        }

        // Scroll down for more tweets
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight)
        })
        
        await this.randomDelay(2000, 4000)
        scrollAttempts++
      }

      console.log(`✅ Successfully scraped ${tweets.length} tweets for @${username}`)

      return {
        username,
        userId,
        tweets: tweets.slice(0, maxTweets),
      }

    } catch (error) {
      console.error(`❌ Error scraping @${username}:`, error)
      return {
        username,
        userId: '',
        tweets: [],
        error: error instanceof Error ? error.message : 'Unknown scraping error'
      }
    }
  }

  private async extractTweetData(tweetElement: any, expectedUsername: string): Promise<ScrapedTweet | null> {
    try {
      // Get tweet link to extract ID
      const tweetLink = await tweetElement.locator('[data-testid="Time"] a').getAttribute('href')
      if (!tweetLink) return null

      const tweetId = tweetLink.split('/').pop() || ''
      if (!tweetId) return null

      // Get author username
      const authorElement = await tweetElement.locator('[data-testid="User-Name"] a').first()
      const authorHref = await authorElement.getAttribute('href')
      const authorUsername = authorHref ? authorHref.replace('/', '') : expectedUsername

      // Skip if not the expected user (retweets, replies from others)
      if (authorUsername.toLowerCase() !== expectedUsername.toLowerCase()) {
        return null
      }

      // Extract tweet content
      const contentElement = await tweetElement.locator('[data-testid="tweetText"]').first()
      const content = await contentElement.textContent() || ''

      // Skip if no content or too short
      if (!content || content.length < 10) {
        return null
      }

      // Extract timestamp
      const timeElement = await tweetElement.locator('[data-testid="Time"] time')
      const datetime = await timeElement.getAttribute('datetime')
      const publishedAt = datetime || new Date().toISOString()

      // Extract engagement metrics
      let likeCount = 0
      let replyCount = 0
      let retweetCount = 0

      try {
        const likeElement = await tweetElement.locator('[data-testid="like"] span').textContent()
        likeCount = this.parseCount(likeElement || '0')
      } catch (e) {}

      try {
        const replyElement = await tweetElement.locator('[data-testid="reply"] span').textContent()
        replyCount = this.parseCount(replyElement || '0')
      } catch (e) {}

      try {
        const retweetElement = await tweetElement.locator('[data-testid="retweet"] span').textContent()
        retweetCount = this.parseCount(retweetElement || '0')
      } catch (e) {}

      return {
        tweetId,
        content: content.trim(),
        authorUsername,
        publishedAt,
        likeCount,
        replyCount,
        retweetCount,
        scrapedAt: new Date().toISOString(),
      }

    } catch (error) {
      console.log('Error extracting individual tweet:', error)
      return null
    }
  }

  private parseCount(countStr: string): number {
    if (!countStr) return 0
    
    const cleanStr = countStr.replace(/,/g, '').toLowerCase()
    
    if (cleanStr.includes('k')) {
      return Math.floor(parseFloat(cleanStr.replace('k', '')) * 1000)
    }
    if (cleanStr.includes('m')) {
      return Math.floor(parseFloat(cleanStr.replace('m', '')) * 1000000)
    }
    
    return parseInt(cleanStr) || 0
  }

  async scrapeMultipleUsers(usernames: string[], maxTweetsPerUser: number = 10): Promise<ScrapeResult[]> {
    const results: ScrapeResult[] = []
    
    for (const username of usernames) {
      try {
        console.log(`🎯 Processing user ${results.length + 1}/${usernames.length}: @${username}`)
        
        const result = await this.scrapeUserTweets(username, maxTweetsPerUser)
        results.push(result)
        
        // Much longer delay between users to avoid detection
        if (results.length < usernames.length) {
          await this.randomDelay(15000, 30000) // 15-30 seconds between users
        }
        
      } catch (error) {
        console.error(`❌ Failed to scrape @${username}:`, error)
        results.push({
          username,
          userId: '',
          tweets: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return results
  }
}