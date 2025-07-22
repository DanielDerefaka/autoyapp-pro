'use client'

import { useQuery } from '@tanstack/react-query'

export interface EngagementMetrics {
  totalReplies: number
  sentReplies: number
  failedReplies: number
  pendingReplies: number
  successRate: number
  averageResponseTime: number
  engagementsByType: Record<string, number>
  dailyStats: Array<{
    date: string
    replies: number
    engagements: number
  }>
}

export interface TargetAnalytics {
  targetUsername: string
  totalTweets: number
  repliesSent: number
  engagementScore: number
  lastActivity: string | null
  sentimentDistribution: {
    positive: number
    negative: number
    neutral: number
  }
}

export interface PerformanceMetrics {
  period: string
  totalEngagements: number
  responseRate: number
  conversionRate: number
  topPerformingTargets: Array<{
    username: string
    engagements: number
    replies: number
  }>
  engagementTrends: Array<{
    date: string
    engagements: number
    replies: number
    rate: number
  }>
}

// Get engagement metrics with aggressive caching
export function useEngagementMetrics(params: {
  startDate?: string
  endDate?: string
  targetUserId?: string
  engagementType?: string
} = {}) {
  // Normalize parameters for consistent caching
  const normalizedParams = {
    startDate: params.startDate,
    endDate: params.endDate,
    targetUserId: params.targetUserId,
    engagementType: params.engagementType,
  }

  return useQuery({
    queryKey: ['analytics', 'engagement', 'metrics', normalizedParams],
    queryFn: async (): Promise<EngagementMetrics> => {
      const searchParams = new URLSearchParams()
      
      Object.entries(normalizedParams).forEach(([key, value]) => {
        if (value) {
          searchParams.set(key, value)
        }
      })
      
      const response = await fetch(`/api/analytics/engagement?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch engagement metrics')
      }
      return response.json()
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - analytics don't change often
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  })
}

// Get target analytics
export function useTargetAnalytics(params: {
  startDate?: string
  endDate?: string
} = {}) {
  return useQuery({
    queryKey: ['analytics', 'targets', params],
    queryFn: async (): Promise<{
      targets: TargetAnalytics[]
      summary: {
        totalTargets: number
        totalTweets: number
        totalReplies: number
        totalEngagements: number
        averageEngagementPerTarget: number
      }
    }> => {
      const searchParams = new URLSearchParams()
      
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          searchParams.set(key, value)
        }
      })
      
      const response = await fetch(`/api/analytics/targets?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch target analytics')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get performance metrics
export function usePerformanceMetrics(period: 'daily' | 'weekly' | 'monthly' = 'monthly') {
  return useQuery({
    queryKey: ['analytics', 'performance', period],
    queryFn: async (): Promise<PerformanceMetrics> => {
      const response = await fetch(`/api/analytics/performance?period=${period}`)
      if (!response.ok) {
        throw new Error('Failed to fetch performance metrics')
      }
      return response.json()
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}