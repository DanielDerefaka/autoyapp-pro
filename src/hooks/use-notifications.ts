'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface NotificationPreferences {
  dailyDigest: boolean
  complianceAlerts: boolean
  successNotifications: boolean
  errorAlerts: boolean
  weeklyReports: boolean
}

export interface NotificationData {
  user: {
    email: string
    name?: string
  }
  preferences: NotificationPreferences
}

// Get notification preferences
export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: async (): Promise<NotificationData> => {
      const response = await fetch('/api/notifications/preferences')
      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Update notification preferences
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (preferences: NotificationPreferences): Promise<NotificationData> => {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })
      if (!response.ok) {
        throw new Error('Failed to update notification preferences')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] })
    },
  })
}

// Send notification email
export function useSendNotification() {
  return useMutation({
    mutationFn: async (data: {
      type: 'welcome' | 'daily_digest' | 'compliance_alert' | 'weekly_report' | 'success_notification'
      data: Record<string, any>
    }) => {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send notification')
      }
      return response.json()
    },
  })
}