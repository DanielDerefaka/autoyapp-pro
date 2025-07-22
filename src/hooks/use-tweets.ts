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

// Get tweets with optimized caching and pagination
export function useTweets(filters: TweetFilters = {}) {
  // Normalize filters to prevent cache misses
  const normalizedFilters = {
    targetUserId: filters.targetUserId,
    sentiment: filters.sentiment,
    sortBy: filters.sortBy || 'recent',
    limit: filters.limit || 20,
    offset: filters.offset || 0,
  }
  
  return useQuery({
    queryKey: ['tweets', 'list', normalizedFilters],
    queryFn: async (): Promise<TweetsResponse> => {
      const searchParams = new URLSearchParams()
      
      // Only add defined parameters
      Object.entries(normalizedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, value.toString())
        }
      })
      
      const response = await fetch(`/api/tweets?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tweets')
      }
      return response.json()
    },
    staleTime: 1 * 60 * 1000, // 1 minute - tweets change frequently
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
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