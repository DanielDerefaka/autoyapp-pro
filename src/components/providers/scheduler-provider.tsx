'use client'

import { useEffect } from 'react'

export function SchedulerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize enhanced scheduler on client-side
    const initScheduler = async () => {
      try {
        // Import both schedulers dynamically to avoid SSR issues
        const [{ TweetScheduler }, { EnhancedTweetScheduler, tweetScheduler }] = await Promise.all([
          import('@/lib/scheduler'),
          import('@/lib/scheduler-enhanced')
        ])
        
        console.log('🔧 Initializing scheduler providers...')
        
        // Start the enhanced scheduler (primary)
        if (!tweetScheduler.isSchedulerRunning()) {
          console.log('🚀 Starting enhanced tweet scheduler...')
          tweetScheduler.start()
          
          // Log status for debugging
          console.log('📊 Enhanced scheduler status:', tweetScheduler.getStatus())
        }
        
        // Start legacy scheduler as backup in development
        if (process.env.NODE_ENV === 'development' && !TweetScheduler.isRunning()) {
          console.log('🚀 Starting legacy scheduler (dev backup)...')
          TweetScheduler.start()
        }
        
      } catch (error) {
        console.error('❌ Failed to initialize schedulers:', error)
      }
    }

    // Small delay to ensure everything is loaded
    const timer = setTimeout(initScheduler, 3000)
    
    return () => {
      clearTimeout(timer)
      // Cleanup schedulers on unmount
      import('@/lib/scheduler-enhanced').then(({ tweetScheduler }) => {
        tweetScheduler.stop()
      })
      import('@/lib/scheduler').then(({ TweetScheduler }) => {
        TweetScheduler.stop()
      })
    }
  }, [])

  return <>{children}</>
}