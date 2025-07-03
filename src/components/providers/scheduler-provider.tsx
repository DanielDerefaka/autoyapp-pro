'use client'

import { useEffect } from 'react'

export function SchedulerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize scheduler on client-side
    const initScheduler = async () => {
      try {
        // Import scheduler dynamically to avoid SSR issues
        const { TweetScheduler } = await import('@/lib/scheduler')
        
        if (!TweetScheduler.isRunning()) {
          console.log('🚀 Initializing tweet scheduler from client...')
          TweetScheduler.start()
        }
      } catch (error) {
        console.error('❌ Failed to initialize scheduler:', error)
      }
    }

    // Small delay to ensure everything is loaded
    const timer = setTimeout(initScheduler, 2000)
    
    return () => clearTimeout(timer)
  }, [])

  return <>{children}</>
}