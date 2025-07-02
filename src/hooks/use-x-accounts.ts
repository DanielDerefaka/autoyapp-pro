'use client'

import { useQuery } from '@tanstack/react-query'

export interface XAccount {
  id: string
  userId: string
  xUserId: string
  username: string
  isActive: boolean
  lastActivity?: string
  createdAt: string
}

// Get connected X accounts
export function useXAccounts() {
  return useQuery({
    queryKey: ['x-accounts'],
    queryFn: async (): Promise<XAccount[]> => {
      const response = await fetch('/api/x-oauth/status')
      if (!response.ok) {
        throw new Error('Failed to fetch X accounts')
      }
      const data = await response.json()
      return data.xAccount ? [data.xAccount] : []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}