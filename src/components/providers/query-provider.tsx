'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Optimized caching for mobile performance
            staleTime: 2 * 60 * 1000, // 2 minutes - fresher data for mobile
            gcTime: 15 * 60 * 1000, // 15 minutes - longer cache retention
            
            // Mobile-optimized refetching strategy
            refetchOnWindowFocus: false, // Avoid unnecessary refetches
            refetchOnReconnect: true, // Important for mobile network switches
            refetchOnMount: false, // Use cached data first for speed
            refetchInterval: false, // Disable background refetching for performance
            
            // Optimized retry configuration for mobile
            retry: (failureCount, error: any) => {
              // Don't retry 4xx errors (client errors)
              if (error?.status >= 400 && error?.status < 500) return false
              // Reduced retries for mobile performance
              return failureCount < 2
            },
            retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 5000),
            
            // Network mode optimized for mobile
            networkMode: 'online',
            
            // Mobile performance optimizations
            suspense: false,
            useErrorBoundary: false,
            
            // Prefetch optimization
            placeholderData: (previousData) => previousData, // Keep previous data while loading
          },
          mutations: {
            // Faster mutations for mobile
            retry: 1,
            retryDelay: 500,
            
            // Network mode for mutations
            networkMode: 'online',
            
            // Mutation optimizations
            useErrorBoundary: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}