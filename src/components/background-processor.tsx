'use client'

import { useEffect } from 'react'

export function BackgroundProcessor() {
  useEffect(() => {
    // Only run if user is active on the site
    let intervalId: NodeJS.Timeout

    const runProcessor = async () => {
      try {
        // Call the unified processor endpoint
        const response = await fetch('/api/cron/unified-processor', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer dev_cron_secret_12345',
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const result = await response.json()
          console.log('✅ Background processor completed:', result)
        } else {
          console.error('❌ Background processor failed:', response.status)
        }
      } catch (error) {
        console.error('❌ Background processor error:', error)
      }
    }

    // Run immediately when component mounts
    runProcessor()

    // Then run every 5 minutes while user is active
    intervalId = setInterval(() => {
      // Only run if the page is visible (user is active)
      if (!document.hidden) {
        runProcessor()
      }
    }, 5 * 60 * 1000) // 5 minutes

    // Cleanup interval on unmount
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  return null // This component doesn't render anything
}