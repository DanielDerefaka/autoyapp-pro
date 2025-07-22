'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { Tweet, TweetFilters } from './use-tweets'

export interface InfiniteTweetsResponse {
  tweets: Tweet[]
  nextCursor?: string
  hasMore: boolean
  totalCount: number
}

/**
 * High-performance infinite query for tweets
 * Perfect for feeds and mobile apps with endless scrolling
 */
export function useInfiniteTweets(filters: Omit<TweetFilters, 'limit' | 'offset'> = {}) {
  // Normalize filters for consistent caching
  const normalizedFilters = {
    targetUserId: filters.targetUserId,
    sentiment: filters.sentiment,
    sortBy: filters.sortBy || 'recent',
  }

  return useInfiniteQuery({
    queryKey: ['tweets', 'infinite', normalizedFilters],
    queryFn: async ({ pageParam = 0 }): Promise<InfiniteTweetsResponse> => {
      const searchParams = new URLSearchParams()
      
      // Add filters
      Object.entries(normalizedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, value.toString())
        }
      })
      
      // Add pagination
      searchParams.set('limit', '20') // Always load 20 items per page
      searchParams.set('offset', pageParam.toString())
      
      const response = await fetch(`/api/tweets?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tweets')
      }
      
      const data = await response.json()
      
      return {
        tweets: data.tweets || [],
        nextCursor: data.hasMore ? pageParam + 20 : undefined,
        hasMore: data.hasMore || false,
        totalCount: data.totalCount || 0,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    maxPages: 10, // Prevent infinite memory usage
  })
}

/**
 * Hook to get flattened tweets array from infinite query
 */
export function useFlattenedTweets(filters: Omit<TweetFilters, 'limit' | 'offset'> = {}) {
  const infiniteQuery = useInfiniteTweets(filters)
  
  const flattenedTweets = infiniteQuery.data?.pages.flatMap(page => page.tweets) || []
  
  return {
    ...infiniteQuery,
    tweets: flattenedTweets,
    totalLoadedCount: flattenedTweets.length,
  }
}