// Enhanced scheduler that works in both development and production
// Uses internal endpoints for better Vercel compatibility

let schedulerInterval: NodeJS.Timeout | null = null

export class TweetScheduler {
  static start() {
    if (schedulerInterval) {
      console.log('📅 Tweet scheduler already running')
      return
    }

    console.log('🚀 Starting tweet scheduler...')
    
    // Run every minute to check for scheduled tweets
    schedulerInterval = setInterval(async () => {
      try {
        console.log('⏰ Checking for scheduled tweets...')
        
        const cronSecret = process.env.CRON_SECRET
        console.log('🔑 Scheduler sending auth:', cronSecret ? `Bearer ${cronSecret.substring(0, 10)}...` : 'null')
        
        // Get the base URL dynamically
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : process.env.APP_URL || 'http://localhost:3000'
        
        console.log('🌐 Scheduler calling:', `${baseUrl}/api/cron/process-scheduled-tweets`)
        
        // Call our cron endpoint
        const response = await fetch(`${baseUrl}/api/cron/process-scheduled-tweets`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cronSecret}`,
            'Content-Type': 'application/json',
            'User-Agent': 'internal-cron-scheduler'
          }
        })

        if (response.ok) {
          const result = await response.json()
          if (result.processed > 0) {
            console.log(`✅ Scheduler processed ${result.processed} scheduled tweets`)
          }
        } else {
          console.error('❌ Scheduler request failed:', response.status)
        }
      } catch (error) {
        console.error('❌ Scheduler error:', error)
      }
    }, 60000) // Every minute

    console.log('✅ Tweet scheduler started (checking every minute)')
  }

  static stop() {
    if (schedulerInterval) {
      clearInterval(schedulerInterval)
      schedulerInterval = null
      console.log('⏹️ Tweet scheduler stopped')
    }
  }

  static isRunning(): boolean {
    return schedulerInterval !== null
  }

  // Manual trigger for testing
  static async triggerNow(): Promise<any> {
    try {
      console.log('🔥 Manually triggering scheduler...')
      
      const cronSecret = process.env.CRON_SECRET
      console.log('🔑 Manual trigger sending auth:', cronSecret ? `Bearer ${cronSecret.substring(0, 10)}...` : 'null')
      
      // Get the base URL dynamically
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : process.env.APP_URL || 'http://localhost:3000'
      
      console.log('🌐 Manual trigger calling:', `${baseUrl}/api/cron/process-scheduled-tweets`)
      
      const response = await fetch(`${baseUrl}/api/cron/process-scheduled-tweets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
          'Content-Type': 'application/json',
          'User-Agent': 'manual-cron-trigger'
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Manual trigger successful:', result)
        return result
      } else {
        throw new Error(`Manual trigger failed: ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Manual trigger error:', error)
      throw error
    }
  }
}

// Auto-start in development
if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
  // Small delay to ensure environment is ready
  setTimeout(() => {
    TweetScheduler.start()
  }, 5000)
}