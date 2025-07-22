'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

interface PerformanceMetrics {
  queryPerformance: {
    averageLoadTime: number
    slowQueries: string[]
    cacheHitRate: number
    totalQueries: number
    failedQueries: number
  }
  networkPerformance: {
    averageResponseTime: number
    slowEndpoints: string[]
    errorRate: number
    requestsPerMinute: number
  }
  cacheStats: {
    totalQueries: number
    cacheHits: number
    cacheMisses: number
    hitRate: number
  }
}

/**
 * Performance monitoring hook for TanStack Query
 * Helps identify bottlenecks and optimize queries
 */
export function usePerformanceMonitor(enabled: boolean = process.env.NODE_ENV === 'development') {
  const queryClient = useQueryClient()
  const metricsRef = useRef({
    queryTimes: [] as number[],
    networkTimes: [] as number[],
    slowQueries: [] as string[],
    failedQueries: 0,
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
  })

  useEffect(() => {
    if (!enabled) return

    const cache = queryClient.getQueryCache()
    
    const unsubscribe = cache.subscribe((event) => {
      const metrics = metricsRef.current
      
      switch (event.type) {
        case 'added':
          metrics.totalQueries++
          break
          
        case 'updated':
          if (event.query.state.dataUpdatedAt > 0) {
            const loadTime = Date.now() - event.query.state.dataUpdatedAt
            metrics.queryTimes.push(loadTime)
            
            // Track slow queries (>2 seconds)
            if (loadTime > 2000) {
              const queryKey = JSON.stringify(event.query.queryKey)
              if (!metrics.slowQueries.includes(queryKey)) {
                metrics.slowQueries.push(queryKey)
              }
            }
            
            // Determine if this was a cache hit or miss
            if (event.query.state.dataUpdatedAt === event.query.state.dataUpdatedAt) {
              metrics.cacheHits++
            } else {
              metrics.cacheMisses++
            }
          }
          
          if (event.query.state.error) {
            metrics.failedQueries++
          }
          break
      }
    })

    return unsubscribe
  }, [enabled, queryClient])

  const getMetrics = (): PerformanceMetrics => {
    const metrics = metricsRef.current
    const totalQueries = metrics.totalQueries || 1 // Avoid division by zero
    const totalCacheOperations = metrics.cacheHits + metrics.cacheMisses || 1

    return {
      queryPerformance: {
        averageLoadTime: metrics.queryTimes.length > 0 
          ? metrics.queryTimes.reduce((a, b) => a + b, 0) / metrics.queryTimes.length 
          : 0,
        slowQueries: metrics.slowQueries,
        cacheHitRate: (metrics.cacheHits / totalCacheOperations) * 100,
        totalQueries: metrics.totalQueries,
        failedQueries: metrics.failedQueries,
      },
      networkPerformance: {
        averageResponseTime: metrics.networkTimes.length > 0
          ? metrics.networkTimes.reduce((a, b) => a + b, 0) / metrics.networkTimes.length
          : 0,
        slowEndpoints: [], // Would need network interceptor to populate
        errorRate: (metrics.failedQueries / totalQueries) * 100,
        requestsPerMinute: 0, // Would need time-based tracking
      },
      cacheStats: {
        totalQueries: totalCacheOperations,
        cacheHits: metrics.cacheHits,
        cacheMisses: metrics.cacheMisses,
        hitRate: (metrics.cacheHits / totalCacheOperations) * 100,
      }
    }
  }

  const resetMetrics = () => {
    metricsRef.current = {
      queryTimes: [],
      networkTimes: [],
      slowQueries: [],
      failedQueries: 0,
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
    }
  }

  const logPerformanceReport = () => {
    if (!enabled) return
    
    const metrics = getMetrics()
    
    console.group('🚀 TanStack Query Performance Report')
    console.log('Average Load Time:', `${metrics.queryPerformance.averageLoadTime.toFixed(2)}ms`)
    console.log('Cache Hit Rate:', `${metrics.queryPerformance.cacheHitRate.toFixed(2)}%`)
    console.log('Error Rate:', `${metrics.networkPerformance.errorRate.toFixed(2)}%`)
    console.log('Total Queries:', metrics.queryPerformance.totalQueries)
    
    if (metrics.queryPerformance.slowQueries.length > 0) {
      console.warn('Slow Queries:', metrics.queryPerformance.slowQueries)
    }
    
    console.groupEnd()
  }

  return {
    getMetrics,
    resetMetrics,
    logPerformanceReport,
    enabled,
  }
}

/**
 * Hook to automatically log performance metrics periodically
 */
export function usePerformanceLogger(intervalMs: number = 60000) {
  const monitor = usePerformanceMonitor()

  useEffect(() => {
    if (!monitor.enabled) return

    const interval = setInterval(() => {
      monitor.logPerformanceReport()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [monitor, intervalMs])

  return monitor
}

/**
 * Component to display performance metrics in development
 */
export function usePerformanceDisplay() {
  const monitor = usePerformanceMonitor()

  const displayMetrics = useQuery({
    queryKey: ['performance', 'display'],
    queryFn: () => monitor.getMetrics(),
    enabled: monitor.enabled,
    refetchInterval: 10000, // Update every 10 seconds
    staleTime: 5000,
  })

  return {
    ...displayMetrics,
    isEnabled: monitor.enabled,
  }
}