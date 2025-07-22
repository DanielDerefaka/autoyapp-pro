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

export interface TargetUsersResponse {
  data: TargetUser[]
  pagination: {
    limit: number
    offset: number
    totalCount: number
    hasMore: boolean
    page: number
    totalPages: number
  }
}

// Get all target users with optimized caching and pagination
export function useTargets(filters: { 
  isActive?: boolean
  limit?: number
  offset?: number
} = {}) {
  const normalizedFilters = {
    isActive: filters.isActive,
    limit: filters.limit || 50, // Default pagination
    offset: filters.offset || 0,
  }

  return useQuery({
    queryKey: ['targets', 'list', normalizedFilters],
    queryFn: async (): Promise<TargetUsersResponse> => {
      const searchParams = new URLSearchParams()
      
      // Only add defined parameters
      Object.entries(normalizedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, value.toString())
        }
      })
      
      const response = await fetch(`/api/targets?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch targets')
      }
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - targets don't change often
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
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

// Add new target user with optimistic updates
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
        const error = await response.json()
        throw new Error(error.message || 'Failed to add target')
      }
      return response.json()
    },
    onMutate: async (newTarget) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['targets'] })

      // Snapshot the previous value
      const previousTargets = queryClient.getQueriesData({ queryKey: ['targets'] })

      // Optimistically update to the new value
      queryClient.setQueriesData(
        { queryKey: ['targets'] },
        (old: TargetUsersResponse | undefined) => {
          if (!old) return {
            data: [],
            pagination: {
              limit: 50,
              offset: 0,
              totalCount: 0,
              hasMore: false,
              page: 1,
              totalPages: 0
            }
          }
          
          const optimisticTarget: TargetUser = {
            id: `temp-${Date.now()}`,
            userId: 'current-user',
            xAccountId: newTarget.xAccountId,
            targetUsername: newTarget.targetUsername,
            targetUserId: undefined,
            isActive: true,
            lastScraped: undefined,
            engagementScore: 0,
            notes: newTarget.notes,
            createdAt: new Date().toISOString(),
            xAccount: { username: 'Loading...' },
            _count: { tweets: 0, analytics: 0 },
          }
          
          return {
            ...old,
            data: [optimisticTarget, ...old.data],
            pagination: {
              ...old.pagination,
              totalCount: old.pagination.totalCount + 1
            }
          }
        }
      )

      // Return a context object with the snapshotted value
      return { previousTargets }
    },
    onError: (err, newTarget, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTargets) {
        context.previousTargets.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      // Always refetch after error or success to sync with server state
      queryClient.invalidateQueries({ queryKey: ['targets'] })
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