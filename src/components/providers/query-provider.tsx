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
            // Aggressive caching for better performance
            staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
            gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
            
            // Smart refetching strategy
            refetchOnWindowFocus: false, // Don't refetch on focus
            refetchOnReconnect: 'always', // Do refetch when reconnecting
            refetchOnMount: true, // Refetch when component mounts
            
            // Retry configuration
            retry: (failureCount, error: any) => {
              // Don't retry 4xx errors (client errors)
              if (error?.status >= 400 && error?.status < 500) return false
              // Retry up to 3 times for other errors
              return failureCount < 3
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            
            // Network mode
            networkMode: 'always',
          },
          mutations: {
            // Retry failed mutations
            retry: 1,
            retryDelay: 1000,
            
            // Network mode for mutations
            networkMode: 'always',
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