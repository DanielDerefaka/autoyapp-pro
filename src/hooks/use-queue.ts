'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface QueueStatus {
  queueStats: {
    replies: Record<string, number>
    scraping: Record<string, number>
    compliance: Record<string, number>
    analytics: Record<string, number>
  }
  userCounts: {
    pending: number
    sent: number
    failed: number
    cancelled: number
  }
  recentActivity: Array<{
    id: string
    replyContent: string
    status: string
    createdAt: string
    tweet: {
      content: string
      targetUser: {
        targetUsername: string
      }
    }
  }>
  todayStats: {
    total: number
    sent: number
    failed: number
  }
}

// Get queue status
export function useQueueStatus() {
  return useQuery({
    queryKey: ['queue', 'status'],
    queryFn: async (): Promise<QueueStatus> => {
      const response = await fetch('/api/queue/status')
      if (!response.ok) {
        throw new Error('Failed to fetch queue status')
      }
      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

// Manage queue operations
export function useManageQueue() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      action: 'pause' | 'resume' | 'clear_failed'
      queue: 'replies' | 'scraping' | 'compliance' | 'analytics'
    }) => {
      const response = await fetch('/api/queue/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to manage queue')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'status'] })
    },
  })
}