'use client'

import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import { toast } from 'sonner'

// Optimized Query Keys for better cache management
export const queryKeys = {
  // Auth & User - high priority, frequent access
  user: ['user'] as const,
  xAccounts: ['xAccounts'] as const,
  
  // Targets - medium priority, cache longer
  targets: (filters?: any) => ['targets', filters] as const,
  targetById: (id: string) => ['targets', id] as const,
  
  // Tweets - low priority for caching, refresh often
  tweets: (filters?: any) => ['tweets', filters] as const,
  tweetsByTarget: (targetId: string) => ['tweets', 'target', targetId] as const,
  
  // Replies - medium priority
  replies: ['replies'] as const,
  replyQueue: ['replyQueue'] as const,
  
  // Analytics - cache aggressively, expensive to compute
  analytics: {
    engagement: (params?: any) => ['analytics', 'engagement', params] as const,
    targets: (params?: any) => ['analytics', 'targets', params] as const,
    performance: (period?: string) => ['analytics', 'performance', period] as const,
  },
  
  // Templates - cache very long, rarely change
  templates: ['templates'] as const,
  
  // Scheduled Content - medium priority
  scheduledContent: ['scheduledContent'] as const,
  
  // X OAuth - short cache, security sensitive
  xOAuthStatus: ['xOAuthStatus'] as const,
} as const

// Optimized API Helper Functions with better error handling
const apiRequest = async (url: string, options?: RequestInit) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout for mobile

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection')
    }
    throw error
  }
}

// Parallel data fetching hook for dashboard
export const useDashboardData = () => {
  return useQueries({
    queries: [
      {
        queryKey: queryKeys.user,
        queryFn: () => apiRequest('/api/auth/user'),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000,
      },
      {
        queryKey: queryKeys.targets(),
        queryFn: () => apiRequest('/api/targets'),
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 10 * 60 * 1000,
      },
      {
        queryKey: queryKeys.replyQueue,
        queryFn: () => apiRequest('/api/queue'),
        staleTime: 1 * 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000,
      },
      {
        queryKey: queryKeys.analytics.engagement(),
        queryFn: () => apiRequest('/api/analytics/engagement'),
        staleTime: 5 * 60 * 1000, // 5 minutes - analytics are expensive
        gcTime: 15 * 60 * 1000,
      },
    ],
    combine: (results) => {
      return {
        user: results[0]?.data,
        targets: results[1]?.data,
        queue: results[2]?.data,
        analytics: results[3]?.data,
        isLoading: results.some(result => result.isPending),
        isError: results.some(result => result.isError),
        errors: results.map(result => result.error).filter(Boolean),
      }
    }
  })
}

// Optimized individual hooks with better caching
export const useUser = () => {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: () => apiRequest('/api/auth/user'),
    staleTime: 10 * 60 * 1000, // 10 minutes - user data doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 1, // Quick fail for auth issues
  })
}

export const useTargets = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.targets(filters),
    queryFn: () => {
      const searchParams = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value))
          }
        })
      }
      return apiRequest(`/api/targets?${searchParams}`)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  })
}

export const useTweets = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.tweets(filters),
    queryFn: () => {
      const searchParams = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value))
          }
        })
      }
      return apiRequest(`/api/tweets?${searchParams}`)
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - tweets need to be fresh
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    enabled: !!filters || Object.keys(filters || {}).length === 0, // Only run if filters are provided or empty
  })
}

// Analytics hooks with aggressive caching
export const useEngagementMetrics = (params?: any) => {
  return useQuery({
    queryKey: queryKeys.analytics.engagement(params),
    queryFn: () => {
      const searchParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value))
          }
        })
      }
      return apiRequest(`/api/analytics/engagement?${searchParams}`)
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - analytics are expensive to compute
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    placeholderData: (previousData) => previousData,
    retry: 2, // Analytics might need retries
  })
}

export const useTargetAnalytics = (params?: any) => {
  return useQuery({
    queryKey: queryKeys.analytics.targets(params),
    queryFn: () => {
      const searchParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value))
          }
        })
      }
      return apiRequest(`/api/analytics/targets?${searchParams}`)
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    placeholderData: (previousData) => previousData,
  })
}

export const usePerformanceMetrics = (period?: string) => {
  return useQuery({
    queryKey: queryKeys.analytics.performance(period),
    queryFn: () => apiRequest(`/api/analytics/performance?period=${period || 'week'}`),
    staleTime: 15 * 60 * 1000, // 15 minutes - performance data is very expensive
    gcTime: 60 * 60 * 1000, // 1 hour cache
    placeholderData: (previousData) => previousData,
  })
}

// Optimized mutation hooks with better error handling
export const useAddTarget = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (targetData: { targetUsername: string; notes?: string; xAccountId: string }) =>
      apiRequest('/api/targets', {
        method: 'POST',
        body: JSON.stringify(targetData),
      }),
    onMutate: async (newTarget) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['targets'] })
      
      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: ['targets'] })
      
      // Optimistically update all target queries
      queryClient.setQueriesData({ queryKey: ['targets'] }, (old: any) => {
        if (!old) return old
        
        const optimisticTarget = {
          id: `temp-${Date.now()}`,
          targetUsername: newTarget.targetUsername,
          notes: newTarget.notes,
          isActive: true,
          engagementScore: 0,
          createdAt: new Date().toISOString(),
          _count: { tweets: 0, analytics: 0 },
        }
        
        // Handle both paginated and non-paginated responses
        if (old.data && Array.isArray(old.data)) {
          return { ...old, data: [optimisticTarget, ...old.data] }
        } else if (Array.isArray(old)) {
          return [optimisticTarget, ...old]
        }
        return old
      })
      
      return { previousData }
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['targets'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      toast.success('Target user added successfully!')
    },
    onError: (error: Error, newTarget, context) => {
      // Rollback optimistic updates
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error(`Failed to add target: ${error.message}`)
    },
  })
}

// Optimized queue-related hooks
export const useReplyQueue = () => {
  return useQuery({
    queryKey: queryKeys.replyQueue,
    queryFn: () => apiRequest('/api/queue'),
    staleTime: 30 * 1000, // 30 seconds - queue needs to be fresh
    gcTime: 2 * 60 * 1000, // 2 minutes cache
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    placeholderData: (previousData) => previousData,
  })
}

export const useQueueReply = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: {
      tweetId: string
      replyContent: string
      scheduledFor: string
    }) => apiRequest('/api/replies/queue', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      // Invalidate queue and related data
      queryClient.invalidateQueries({ queryKey: queryKeys.replyQueue })
      queryClient.invalidateQueries({ queryKey: queryKeys.tweets() })
      toast.success('Reply scheduled successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to schedule reply: ${error.message}`)
    },
  })
}

// Template hooks with long caching
export const useTemplates = () => {
  return useQuery({
    queryKey: queryKeys.templates,
    queryFn: () => apiRequest('/api/templates'),
    staleTime: 30 * 60 * 1000, // 30 minutes - templates rarely change
    gcTime: 60 * 60 * 1000, // 1 hour cache
    placeholderData: (previousData) => previousData,
  })
}

// X Account hooks with security considerations
export const useXAccounts = () => {
  return useQuery({
    queryKey: queryKeys.xAccounts,
    queryFn: () => apiRequest('/api/x-accounts'),
    staleTime: 2 * 60 * 1000, // 2 minutes - account status can change
    gcTime: 10 * 60 * 1000,
    retry: 1, // Quick fail for security issues
  })
}

// Optimized AI generation hooks
export const useGenerateReply = () => {
  return useMutation({
    mutationFn: (data: {
      tweetId: string
      tweetContent: string
      targetUsername: string
      context?: any
    }) => apiRequest('/api/replies/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    retry: 1, // AI generation might be slow, don't retry too much
    onError: (error: Error) => {
      toast.error(`Failed to generate reply: ${error.message}`)
    },
  })
}

// Batch operations for better performance
export const useBatchOperations = () => {
  const queryClient = useQueryClient()
  
  return {
    // Prefetch related data
    prefetchDashboardData: () => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.user,
        queryFn: () => apiRequest('/api/auth/user'),
        staleTime: 5 * 60 * 1000,
      })
      queryClient.prefetchQuery({
        queryKey: queryKeys.targets(),
        queryFn: () => apiRequest('/api/targets'),
        staleTime: 5 * 60 * 1000,
      })
    },
    
    // Invalidate all analytics
    invalidateAnalytics: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
    
    // Clear all caches
    clearAllCaches: () => {
      queryClient.clear()
    },
  }
}