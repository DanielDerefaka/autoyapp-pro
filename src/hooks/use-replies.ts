'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface ReplyQueue {
  id: string
  userId: string
  xAccountId: string
  tweetId: string
  replyContent: string
  replyType: string
  scheduledFor: string
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  retryCount: number
  errorMessage?: string
  sentAt?: string
  createdAt: string
  tweet: {
    content: string
    authorUsername: string
    targetUser: {
      targetUsername: string
    }
  }
  xAccount: {
    username: string
  }
}

export interface ReplyQueueResponse {
  replies: ReplyQueue[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  statusCounts: Record<string, number>
}

export interface GenerateReplyData {
  tweetId: string
  replyTone: 'professional' | 'casual' | 'friendly' | 'technical' | 'humorous'
  templateId?: string
  userContext?: string
  includeCall2Action?: boolean
  scheduleFor?: string
}

// Get reply queue
export function useReplyQueue(params: {
  page?: number
  limit?: number
  status?: string
} = {}) {
  const { page = 1, limit = 10, status } = params
  
  return useQuery({
    queryKey: ['replies', 'queue', { page, limit, status }],
    queryFn: async (): Promise<ReplyQueueResponse> => {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      
      if (status) {
        searchParams.set('status', status)
      }
      
      const response = await fetch(`/api/replies/queue?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch reply queue')
      }
      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

// Get single reply
export function useReply(id: string) {
  return useQuery({
    queryKey: ['replies', id],
    queryFn: async (): Promise<ReplyQueue> => {
      const response = await fetch(`/api/replies/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch reply')
      }
      return response.json()
    },
    enabled: !!id,
  })
}

// Generate AI reply
export function useGenerateReply() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: GenerateReplyData) => {
      const response = await fetch('/api/replies/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to generate reply')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replies', 'queue'] })
    },
  })
}

// Update reply
export function useUpdateReply() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string
      data: {
        replyContent?: string
        scheduledFor?: string
        status?: 'pending' | 'cancelled'
      }
    }) => {
      const response = await fetch(`/api/replies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to update reply')
      }
      return response.json()
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['replies', 'queue'] })
      queryClient.invalidateQueries({ queryKey: ['replies', id] })
    },
  })
}

// Cancel reply
export function useCancelReply() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/replies/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to cancel reply')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replies', 'queue'] })
    },
  })
}