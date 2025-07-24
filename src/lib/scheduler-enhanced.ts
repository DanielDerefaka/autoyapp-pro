/**
 * Enhanced Tweet Scheduler for Vercel Production
 * Uses multiple strategies to ensure scheduled posts are published on time
 */

interface SchedulerOptions {
  intervalMinutes?: number
  retryAttempts?: number
  retryDelayMs?: number
}

export class EnhancedTweetScheduler {
  private static instance: EnhancedTweetScheduler | null = null
  private intervalId: NodeJS.Timeout | null = null
  private options: Required<SchedulerOptions>
  private isRunning = false

  private constructor(options: SchedulerOptions = {}) {
    this.options = {
      intervalMinutes: options.intervalMinutes || 1, // Check every minute
      retryAttempts: options.retryAttempts || 3,
      retryDelayMs: options.retryDelayMs || 5000
    }
  }

  static getInstance(options?: SchedulerOptions): EnhancedTweetScheduler {
    if (!EnhancedTweetScheduler.instance) {
      EnhancedTweetScheduler.instance = new EnhancedTweetScheduler(options)
    }
    return EnhancedTweetScheduler.instance
  }

  private getBaseUrl(): string {
    // Priority order for base URL determination
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
    if (process.env.APP_URL) {
      return process.env.APP_URL
    }
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return 'http://localhost:3000'
  }

  private async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}) {
    const baseUrl = this.getBaseUrl()
    const cronSecret = process.env.CRON_SECRET || 'dev_cron_secret_12345'
    
    const url = `${baseUrl}${endpoint}`
    const headers = {
      'Authorization': `Bearer ${cronSecret}`,
      'Content-Type': 'application/json',
      'User-Agent': 'enhanced-tweet-scheduler',
      ...options.headers
    }

    console.log(`🔗 Scheduler calling: ${url}`)

    // Create an AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        ...options,
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Request timeout after 30 seconds')
      }
      throw error
    }
  }

  private async processScheduledTweets(): Promise<any> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        console.log(`📅 Processing scheduled tweets (attempt ${attempt}/${this.options.retryAttempts})`)
        
        const result = await this.makeAuthenticatedRequest('/api/cron/process-scheduled-tweets')
        
        if (result.processed > 0) {
          console.log(`✅ Successfully processed ${result.processed} scheduled tweets`)
        }
        
        return result
        
      } catch (error) {
        lastError = error as Error
        console.error(`❌ Attempt ${attempt} failed:`, error)
        
        if (attempt < this.options.retryAttempts) {
          console.log(`⏳ Retrying in ${this.options.retryDelayMs}ms...`)
          await new Promise(resolve => setTimeout(resolve, this.options.retryDelayMs))
        }
      }
    }
    
    throw lastError
  }

  private async processReplyQueue(): Promise<any> {
    try {
      console.log('💬 Processing reply queue...')
      const result = await this.makeAuthenticatedRequest('/api/cron/process-reply-queue')
      
      if (result.processed > 0) {
        console.log(`✅ Successfully processed ${result.processed} queued replies`)
      }
      
      return result
      
    } catch (error) {
      console.error('❌ Reply queue processing failed:', error)
      throw error
    }
  }

  private async scheduleCheckLoop() {
    try {
      // Process both scheduled tweets and reply queue
      await Promise.allSettled([
        this.processScheduledTweets(),
        this.processReplyQueue()
      ])
      
    } catch (error) {
      console.error('❌ Scheduler loop error:', error)
    }
  }

  start(): void {
    if (this.isRunning) {
      console.log('📅 Enhanced scheduler already running')
      return
    }

    console.log(`🚀 Starting enhanced tweet scheduler (every ${this.options.intervalMinutes} minute(s))`)
    
    // Run immediately
    this.scheduleCheckLoop()
    
    // Set up interval
    const intervalMs = this.options.intervalMinutes * 60 * 1000
    this.intervalId = setInterval(() => {
      this.scheduleCheckLoop()
    }, intervalMs)
    
    this.isRunning = true
    console.log('✅ Enhanced scheduler started successfully')
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    
    this.isRunning = false
    console.log('⏹️ Enhanced scheduler stopped')
  }

  isSchedulerRunning(): boolean {
    return this.isRunning
  }

  // Manual triggers for testing
  async triggerTweetProcessing(): Promise<any> {
    console.log('🔥 Manually triggering tweet processing...')
    return this.processScheduledTweets()
  }

  async triggerReplyProcessing(): Promise<any> {
    console.log('🔥 Manually triggering reply processing...')
    return this.processReplyQueue()
  }

  async triggerAll(): Promise<{ tweets: any; replies: any }> {
    console.log('🔥 Manually triggering all processing...')
    
    const [tweetsResult, repliesResult] = await Promise.allSettled([
      this.processScheduledTweets(),
      this.processReplyQueue()
    ])
    
    return {
      tweets: tweetsResult.status === 'fulfilled' ? tweetsResult.value : { error: tweetsResult.reason?.message },
      replies: repliesResult.status === 'fulfilled' ? repliesResult.value : { error: repliesResult.reason?.message }
    }
  }

  // Get scheduler status for debugging
  getStatus() {
    return {
      isRunning: this.isRunning,
      options: this.options,
      baseUrl: this.getBaseUrl(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelUrl: process.env.VERCEL_URL,
        appUrl: process.env.APP_URL,
        cronSecret: process.env.CRON_SECRET ? 'configured' : 'missing'
      }
    }
  }
}

// Auto-start scheduler in appropriate environments
if (typeof window === 'undefined') { // Server-side only
  const shouldAutoStart = 
    process.env.NODE_ENV === 'development' || 
    process.env.VERCEL_ENV === 'production'
  
  if (shouldAutoStart) {
    // Small delay to ensure environment is ready
    setTimeout(() => {
      const scheduler = EnhancedTweetScheduler.getInstance({
        intervalMinutes: process.env.NODE_ENV === 'development' ? 1 : 2 // More frequent in dev
      })
      scheduler.start()
    }, 3000)
  }
}

// Export the instance for use in other parts of the app
export const tweetScheduler = EnhancedTweetScheduler.getInstance()