'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface TargetUser {
  id: string
  userId: string
  xAccountId: string
  targetUsername: string
  targetUserId?: string
  isActive: boolean
  lastScraped?: string
  engagementScore: number
  notes?: string
  createdAt: string
  xAccount: {
    username: string
  }
  _count: {
    tweets: number
    analytics: number
  }
}

export interface CreateTargetData {
  targetUsername: string
  xAccountId: string
  notes?: string
}

// Get all target users
export function useTargets() {
  return useQuery({
    queryKey: ['targets'],
    queryFn: async (): Promise<TargetUser[]> => {
      const response = await fetch(`/api/targets?_t=${Date.now()}`, {
        cache: 'no-cache'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch targets')
      }
      return response.json()
    },
    staleTime: 10 * 1000, // 10 seconds minimal caching
  })
}

// Get single target user
export function useTarget(id: string) {
  return useQuery({
    queryKey: ['targets', id],
    queryFn: async (): Promise<TargetUser> => {
      const response = await fetch(`/api/targets/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch target')
      }
      return response.json()
    },
    enabled: !!id,
  })
}

// Add new target user
export function useAddTarget() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateTargetData): Promise<TargetUser> => {
      const response = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to add target')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] })
      queryClient.invalidateQueries({ queryKey: ['tweets'] }) // Invalidate tweets when targets change
    },
  })
}

// Update target user
export function useUpdateTarget() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TargetUser> }) => {
      const response = await fetch(`/api/targets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to update target')
      }
      return response.json()
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['targets'] })
      queryClient.invalidateQueries({ queryKey: ['targets', id] })
    },
  })
}

// Delete target user
export function useDeleteTarget() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/targets/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete target')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] })
      queryClient.invalidateQueries({ queryKey: ['tweets'] }) // Invalidate tweets when targets change
    },
  })
}