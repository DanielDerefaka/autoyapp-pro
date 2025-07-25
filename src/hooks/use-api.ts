'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { trackApiRequest, performanceMonitor } from '@/lib/performance-monitor'

// Query Keys
export const queryKeys = {
  // Auth & User
  user: ['user'] as const,
  xAccounts: ['xAccounts'] as const,
  
  // Targets
  targets: ['targets'] as const,
  targetById: (id: string) => ['targets', id] as const,
  
  // Tweets
  tweets: (filters?: any) => ['tweets', filters] as const,
  tweetsByTarget: (targetId: string) => ['tweets', 'target', targetId] as const,
  
  // Replies
  replies: ['replies'] as const,
  replyQueue: ['replyQueue'] as const,
  
  // Analytics
  analytics: {
    engagement: (params?: any) => ['analytics', 'engagement', params] as const,
    targets: (params?: any) => ['analytics', 'targets', params] as const,
    performance: (period?: string) => ['analytics', 'performance', period] as const,
  },
  
  // Templates
  templates: ['templates'] as const,
  
  // Scheduled Content
  scheduledContent: ['scheduledContent'] as const,
  scheduledContentById: (id: string) => ['scheduledContent', id] as const,
  
  // X OAuth
  xOAuthStatus: ['xOAuthStatus'] as const,
} as const

// Optimized API Helper Functions with performance tracking
const apiRequest = async (url: string, options?: RequestInit) => {
  return trackApiRequest(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

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
        const error = new Error(errorData.error || `HTTP ${response.status}`)
        ;(error as any).status = response.status
        throw error
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection')
      }
      throw error
    }
  }, url.replace('/api/', ''))
}

const apiFormData = async (url: string, formData: FormData) => {
  return trackApiRequest(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout for uploads

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
        const error = new Error(errorData.error || `HTTP ${response.status}`)
        ;(error as any).status = response.status
        throw error
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Upload timeout - please check your connection')
      }
      throw error
    }
  }, `${url.replace('/api/', '')}-upload`)
}

// User & Auth Hooks - Optimized for mobile
export const useUser = () => {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: () => apiRequest('/api/auth/user'),
    staleTime: 10 * 60 * 1000, // 10 minutes - user data rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 1, // Quick fail for auth issues
    placeholderData: (previousData) => previousData,
  })
}

export const useXAccounts = () => {
  return useQuery({
    queryKey: queryKeys.xAccounts,
    queryFn: () => apiRequest('/api/x-accounts'),
    staleTime: 5 * 60 * 1000, // 5 minutes - account status doesn't change often
    gcTime: 15 * 60 * 1000,
    retry: 1, // Quick fail for security issues
    placeholderData: (previousData) => previousData,
  })
}

export const useXOAuthStatus = () => {
  return useQuery({
    queryKey: queryKeys.xOAuthStatus,
    queryFn: () => apiRequest('/api/x-oauth/status'),
    staleTime: 2 * 60 * 1000, // 2 minutes - OAuth status is more stable
    gcTime: 10 * 60 * 1000,
    retry: 1,
    placeholderData: (previousData) => previousData,
  })
}

// Target Hooks - Optimized caching
export const useTargets = () => {
  return useQuery({
    queryKey: queryKeys.targets,
    queryFn: () => apiRequest('/api/targets'),
    staleTime: 5 * 60 * 1000, // 5 minutes - targets change infrequently
    gcTime: 15 * 60 * 1000, // 15 minutes cache
    placeholderData: (previousData) => previousData,
    refetchOnMount: false, // Use cache first for speed
  })
}

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
      await queryClient.cancelQueries({ queryKey: queryKeys.targets })
      
      // Snapshot the previous value
      const previousTargets = queryClient.getQueryData(queryKeys.targets)
      
      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.targets, (old: any) => {
        const optimisticTarget = {
          id: `temp-${Date.now()}`,
          targetUsername: newTarget.targetUsername,
          notes: newTarget.notes,
          isActive: true,
          engagementScore: 0,
          createdAt: new Date().toISOString(),
          _count: { tweets: 0, analytics: 0 },
        }
        
        if (!old) {
          return {
            data: [optimisticTarget],
            pagination: { limit: 50, offset: 0, totalCount: 1, hasMore: false, page: 1, totalPages: 1 }
          }
        }
        
        // old has structure { data: [...], pagination: {...} }
        return {
          ...old,
          data: [...(old.data || []), optimisticTarget],
          pagination: {
            ...old.pagination,
            totalCount: (old.pagination?.totalCount || 0) + 1
          }
        }
      })
      
      return { previousTargets }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.targets })
      toast.success('Target user added successfully!')
    },
    onError: (error: Error, newTarget, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.targets, context?.previousTargets)
      toast.error(`Failed to add target: ${error.message}`)
    },
  })
}

export const useUpdateTarget = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/targets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.targets })
      toast.success('Target updated successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update target: ${error.message}`)
    },
  })
}

export const useDeleteTarget = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/targets/${id}`, { method: 'DELETE' }),
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.targets })
      
      // Snapshot the previous value
      const previousTargets = queryClient.getQueryData(queryKeys.targets)
      
      // Optimistically remove the target
      queryClient.setQueryData(queryKeys.targets, (old: any) => {
        if (!old || !old.data) {
          return old
        }
        
        return {
          ...old,
          data: old.data.filter((target: any) => target.id !== deletedId),
          pagination: {
            ...old.pagination,
            totalCount: Math.max((old.pagination?.totalCount || 0) - 1, 0)
          }
        }
      })
      
      return { previousTargets }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.targets })
      toast.success('Target removed successfully!')
    },
    onError: (error: Error, deletedId, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.targets, context?.previousTargets)
      toast.error(`Failed to remove target: ${error.message}`)
    },
  })
}

// Tweet Hooks - Balance freshness with performance
export const useTweets = (filters?: any) => {
  const searchParams = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value))
      }
    })
  }

  return useQuery({
    queryKey: queryKeys.tweets(filters),
    queryFn: () => apiRequest(`/api/tweets?${searchParams}`),
    staleTime: 3 * 60 * 1000, // 3 minutes - balance freshness with performance
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    enabled: true, // Always enabled but use cache first
    refetchOnMount: false,
  })
}

export const useFetchTweets = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => apiRequest('/api/tweets/fetch-real', { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tweets'] })
      if (data.totalNewTweets > 0) {
        toast.success(`Found ${data.totalNewTweets} new tweets!`)
      } else {
        toast.info('No new tweets found.')
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to fetch tweets: ${error.message}`)
    },
  })
}

// Tweet Publishing Hooks
export const usePublishTweet = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ tweets, hasImages }: { tweets: any[]; hasImages: boolean }) => {
      if (hasImages) {
        // Use FormData for tweets with images
        const formData = new FormData()
        const tweetsForUpload = tweets.map(tweet => ({
          content: tweet.content,
          characterCount: tweet.characterCount
        }))
        formData.append('tweets', JSON.stringify(tweetsForUpload))
        
        // Add image files
        tweets.forEach((tweet, tweetIndex) => {
          tweet.images?.forEach((image: File, imageIndex: number) => {
            formData.append(`tweet_${tweetIndex}_image_${imageIndex}`, image)
          })
        })
        
        return apiFormData('/api/tweets/publish', formData)
      } else {
        // Use JSON for text-only tweets
        return apiRequest('/api/tweets/publish', {
          method: 'POST',
          body: JSON.stringify({ tweets }),
        })
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tweets'] })
      queryClient.invalidateQueries({ queryKey: ['scheduledContent'] })
      const tweetCount = data.publishedTweets?.length || 1
      toast.success(`${tweetCount > 1 ? 'Thread' : 'Tweet'} published successfully!`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to publish: ${error.message}`)
    },
  })
}

export const useScheduleTweet = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ tweets, scheduledFor, hasImages }: { 
      tweets: any[]; 
      scheduledFor: string; 
      hasImages: boolean 
    }) => {
      if (hasImages) {
        const formData = new FormData()
        const tweetsForUpload = tweets.map(tweet => ({
          content: tweet.content,
          characterCount: tweet.characterCount
        }))
        formData.append('tweets', JSON.stringify(tweetsForUpload))
        formData.append('scheduledFor', scheduledFor)
        
        tweets.forEach((tweet, tweetIndex) => {
          tweet.images?.forEach((image: File, imageIndex: number) => {
            formData.append(`tweet_${tweetIndex}_image_${imageIndex}`, image)
          })
        })
        
        return apiFormData('/api/tweets/schedule', formData)
      } else {
        return apiRequest('/api/tweets/schedule', {
          method: 'POST',
          body: JSON.stringify({ tweets, scheduledFor }),
        })
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledContent })
      const tweetCount = data.scheduledTweets?.length || 1
      toast.success(`${tweetCount > 1 ? 'Thread' : 'Tweet'} scheduled successfully!`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to schedule: ${error.message}`)
    },
  })
}

// Reply Hooks
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
    onError: (error: Error) => {
      toast.error(`Failed to generate reply: ${error.message}`)
    },
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
      queryClient.invalidateQueries({ queryKey: queryKeys.replyQueue })
      toast.success('Reply scheduled successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to schedule reply: ${error.message}`)
    },
  })
}

// AI Generation Hooks
export const useGenerateAITweet = () => {
  return useMutation({
    mutationFn: (data: { prompt: string; userNiche?: string; userStyle?: any }) =>
      apiRequest('/api/ai/generate-tweet', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onError: (error: Error) => {
      toast.error(`Failed to generate tweet: ${error.message}`)
    },
  })
}

export const useGenerateAIThread = () => {
  return useMutation({
    mutationFn: (data: { prompt: string }) =>
      apiRequest('/api/ai/generate-thread', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onError: (error: Error) => {
      toast.error(`Failed to generate thread: ${error.message}`)
    },
  })
}

// Template Hooks
export const useTemplates = () => {
  return useQuery({
    queryKey: queryKeys.templates,
    queryFn: () => apiRequest('/api/templates'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useCreateTemplate = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: any) => apiRequest('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates })
      toast.success('Template created successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`)
    },
  })
}

// Scheduled Content Hooks
export const useScheduledContent = () => {
  return useQuery({
    queryKey: queryKeys.scheduledContent,
    queryFn: () => apiRequest('/api/scheduled-content'),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export const useUpdateScheduledContent = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/scheduled-content/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledContent })
      toast.success('Scheduled content updated!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`)
    },
  })
}

export const useDeleteScheduledContent = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/scheduled-content/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledContent })
      toast.success('Scheduled content deleted!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`)
    },
  })
}

// X OAuth Hooks
export const useConnectXAccount = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => apiRequest('/api/x-oauth/connect', { method: 'POST' }),
    onSuccess: (data) => {
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to connect X account: ${error.message}`)
    },
  })
}

export const useDisconnectXAccount = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (accountId: string) =>
      apiRequest(`/api/x-oauth/disconnect`, {
        method: 'DELETE',
        body: JSON.stringify({ accountId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.xAccounts })
      queryClient.invalidateQueries({ queryKey: queryKeys.xOAuthStatus })
      toast.success('X account disconnected!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect: ${error.message}`)
    },
  })
}