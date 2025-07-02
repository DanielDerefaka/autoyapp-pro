'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface User {
  id: string
  email: string
  name?: string
  clerkId: string
  subscriptionTier: string
  createdAt: string
  updatedAt: string
  xAccounts: any[]
  subscription?: any
  _count: {
    targetUsers: number
    replyQueue: number
    templates: number
  }
}

// Get current user
export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async (): Promise<User> => {
      const response = await fetch('/api/auth/user')
      if (!response.ok) {
        throw new Error('Failed to fetch user')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Update user profile
export function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await fetch('/api/auth/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to update user')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}