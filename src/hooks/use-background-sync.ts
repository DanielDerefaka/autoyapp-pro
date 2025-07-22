'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

/**
 * Background sync for critical real-time data
 * Polls server for updates without disrupting user experience
 */

interface BackgroundSyncOptions {
  enabled?: boolean
  interval?: number // in milliseconds
  onDataChange?: (newData: any, oldData: any) => void
  silent?: boolean // Don't show loading states
}

export function useBackgroundSync<T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  options: BackgroundSyncOptions = {}
) {
  const {
    enabled = true,
    interval = 30000, // 30 seconds default
    onDataChange,
    silent = true,
  } = options

  const queryClient = useQueryClient()
  const previousDataRef = useRef<T>()

  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime: interval - 1000, // Slightly less than interval
    refetchInterval: enabled ? interval : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    notifyOnChangeProps: silent ? [] : undefined, // Suppress loading states if silent
  })

  // Detect data changes and call callback
  useEffect(() => {
    if (query.data && previousDataRef.current) {
      const hasChanged = JSON.stringify(query.data) !== JSON.stringify(previousDataRef.current)
      if (hasChanged && onDataChange) {
        onDataChange(query.data, previousDataRef.current)
      }
    }
    previousDataRef.current = query.data
  }, [query.data, onDataChange])

  return query
}

/**
 * Background sync for queue status
 */
export function useQueueSync(options: Omit<BackgroundSyncOptions, 'interval'> = {}) {
  return useBackgroundSync(
    ['queue', 'status'],
    async () => {
      const response = await fetch('/api/queue/status')
      if (!response.ok) throw new Error('Failed to fetch queue status')
      return response.json()
    },
    {
      ...options,
      interval: 10000, // Check queue every 10 seconds
    }
  )
}

/**
 * Background sync for critical system health
 */
export function useSystemHealthSync(options: BackgroundSyncOptions = {}) {
  return useBackgroundSync(
    ['system', 'health'],
    async () => {
      const response = await fetch('/api/health')
      if (!response.ok) throw new Error('Failed to fetch system health')
      return response.json()
    },
    {
      ...options,
      interval: 60000, // Check health every minute
    }
  )
}

/**
 * Background sync for new tweets (when user is actively viewing feeds)
 */
export function useNewTweetsSync(
  targetUserId?: string,
  options: BackgroundSyncOptions = {}
) {
  const shouldSync = options.enabled !== false && targetUserId

  return useBackgroundSync(
    ['tweets', 'new', targetUserId],
    async () => {
      const params = new URLSearchParams()
      if (targetUserId) params.set('targetUserId', targetUserId)
      params.set('limit', '5') // Only check for newest tweets
      params.set('sortBy', 'recent')

      const response = await fetch(`/api/tweets?${params}`)
      if (!response.ok) throw new Error('Failed to fetch new tweets')
      return response.json()
    },
    {
      ...options,
      enabled: shouldSync,
      interval: 30000, // Check for new tweets every 30 seconds
      onDataChange: (newData, oldData) => {
        // Notify user about new tweets
        if (newData.tweets?.length > oldData.tweets?.length) {
          console.log('New tweets available!')
          // Could trigger a toast notification here
        }
        options.onDataChange?.(newData, oldData)
      },
    }
  )
}

/**
 * Prefetch hook for likely user actions
 */
export function usePrefetchOptimization() {
  const queryClient = useQueryClient()

  const prefetchTargets = () => {
    queryClient.prefetchQuery({
      queryKey: ['targets', 'list', { limit: 50, offset: 0 }],
      queryFn: async () => {
        const response = await fetch('/api/targets?limit=50&offset=0')
        if (!response.ok) throw new Error('Failed to prefetch targets')
        return response.json()
      },
      staleTime: 2 * 60 * 1000,
    })
  }

  const prefetchAnalytics = () => {
    queryClient.prefetchQuery({
      queryKey: ['analytics', 'engagement', 'metrics', {}],
      queryFn: async () => {
        const response = await fetch('/api/analytics/engagement')
        if (!response.ok) throw new Error('Failed to prefetch analytics')
        return response.json()
      },
      staleTime: 10 * 60 * 1000,
    })
  }

  const prefetchRecentTweets = () => {
    queryClient.prefetchQuery({
      queryKey: ['tweets', 'list', { sortBy: 'recent', limit: 20, offset: 0 }],
      queryFn: async () => {
        const response = await fetch('/api/tweets?sortBy=recent&limit=20&offset=0')
        if (!response.ok) throw new Error('Failed to prefetch tweets')
        return response.json()
      },
      staleTime: 1 * 60 * 1000,
    })
  }

  return {
    prefetchTargets,
    prefetchAnalytics,
    prefetchRecentTweets,
  }
}