'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Tweet {
  id: string
  tweetId: string
  targetUserId: string
  content: string
  authorUsername: string
  publishedAt: string
  likeCount: number
  replyCount: number
  retweetCount: number
  sentimentScore: number | null
  isDeleted: boolean
  scrapedAt: string
  targetUser: {
    id: string
    targetUsername: string
    engagementScore: number
  }
  replies?: Array<{
    id: string
    status: string
    replyContent: string
    scheduledFor: string
    sentAt?: string
  }>
}

export interface TweetsResponse {
  tweets: Tweet[]
  totalCount: number
  hasMore: boolean
}

export interface TweetFilters {
  targetUserId?: string
  sentiment?: 'positive' | 'negative' | 'neutral'
  sortBy?: 'recent' | 'popular' | 'engagement'
  limit?: number
  offset?: number
}

// Get tweets with filters
export function useTweets(filters: TweetFilters = {}) {
  return useQuery({
    queryKey: ['tweets', filters, Date.now()], // Add timestamp to prevent caching
    queryFn: async (): Promise<TweetsResponse> => {
      console.log('Fetching tweets with filters:', filters)
      const searchParams = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, value.toString())
        }
      })
      
      const response = await fetch(`/api/tweets?${searchParams}&_t=${Date.now()}`, {
        cache: 'no-cache', // Prevent browser caching
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch tweets')
      }
      const data = await response.json()
      console.log('Fetched tweets:', data)
      return data
    },
    staleTime: 0, // No caching - always fresh
    gcTime: 0, // Don't keep in memory cache
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  })
}

// Get single tweet
export function useTweet(tweetId: string) {
  return useQuery({
    queryKey: ['tweets', tweetId],
    queryFn: async (): Promise<Tweet> => {
      const response = await fetch(`/api/tweets/${tweetId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tweet')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!tweetId,
  })
}

// Trigger manual scrape
export function useScrapeTweets() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      targetUserIds?: string[]
      forceRefresh?: boolean
    } = {}) => {
      const response = await fetch('/api/tweets/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to scrape tweets')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tweets'] })
    },
  })
}