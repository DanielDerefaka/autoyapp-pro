'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface ReplyTemplate {
  id: string
  userId: string
  name: string
  templateContent: string
  category?: string
  successRate: number
  usageCount: number
  isActive: boolean
  createdAt: string
}

export interface TemplatesResponse {
  templates: ReplyTemplate[]
  categories: string[]
}

export interface CreateTemplateData {
  name: string
  templateContent: string
  category?: string
}

// Get templates
export function useTemplates(params: {
  category?: string
  isActive?: boolean
} = {}) {
  return useQuery({
    queryKey: ['templates', params],
    queryFn: async (): Promise<TemplatesResponse> => {
      const searchParams = new URLSearchParams()
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, value.toString())
        }
      })
      
      const response = await fetch(`/api/templates?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create template
export function useCreateTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateTemplateData): Promise<ReplyTemplate> => {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to create template')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}