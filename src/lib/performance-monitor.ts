/**
 * Performance monitoring utility for tracking page load times and API responses
 * Specifically optimized for mobile API endpoints
 */

interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
  type: 'page-load' | 'api-request' | 'component-render' | 'user-interaction'
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 100 // Keep only last 100 metrics in memory
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Track page loading performance
  trackPageLoad(pageName: string, startTime?: number) {
    const endTime = performance.now()
    const duration = startTime ? endTime - startTime : endTime
    
    this.addMetric({
      name: `page-load-${pageName}`,
      duration,
      timestamp: Date.now(),
      type: 'page-load',
      metadata: {
        url: typeof window !== 'undefined' ? window.location.pathname : 'server',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      }
    })
    
    // Log slow page loads
    if (duration > 3000) {
      console.warn(`🐌 Slow page load detected: ${pageName} took ${duration.toFixed(2)}ms`)
    } else if (duration > 1000) {
      console.log(`⚡ Page loaded: ${pageName} in ${duration.toFixed(2)}ms`)
    }
  }

  // Track API request performance
  trackApiRequest(endpoint: string, duration: number, status?: number) {
    this.addMetric({
      name: `api-${endpoint}`,
      duration,
      timestamp: Date.now(),
      type: 'api-request',
      metadata: {
        endpoint,
        status,
        isMobile: this.isMobileDevice()
      }
    })
    
    // Log slow API requests
    if (duration > 5000) {
      console.warn(`🐌 Slow API request: ${endpoint} took ${duration.toFixed(2)}ms`)
    } else if (duration > 2000) {
      console.log(`⏱️ API request: ${endpoint} took ${duration.toFixed(2)}ms`)
    }
  }

  // Track component render performance
  trackComponentRender(componentName: string, renderTime: number) {
    this.addMetric({
      name: `render-${componentName}`,
      duration: renderTime,
      timestamp: Date.now(),
      type: 'component-render',
      metadata: {
        component: componentName
      }
    })
    
    // Log slow component renders
    if (renderTime > 100) {
      console.warn(`🐌 Slow component render: ${componentName} took ${renderTime.toFixed(2)}ms`)
    }
  }

  // Track user interactions
  trackUserInteraction(action: string, duration: number) {
    this.addMetric({
      name: `interaction-${action}`,
      duration,
      timestamp: Date.now(),
      type: 'user-interaction',
      metadata: {
        action
      }
    })
  }

  // Get performance summary
  getPerformanceSummary() {
    const now = Date.now()
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 5 * 60 * 1000) // Last 5 minutes
    
    const summary = {
      totalMetrics: recentMetrics.length,
      averagePageLoad: this.getAverageByType(recentMetrics, 'page-load'),
      averageApiRequest: this.getAverageByType(recentMetrics, 'api-request'),
      averageComponentRender: this.getAverageByType(recentMetrics, 'component-render'),
      slowRequests: recentMetrics.filter(m => m.duration > 3000),
      fastRequests: recentMetrics.filter(m => m.duration < 1000),
      isMobile: this.isMobileDevice(),
      connectionType: this.getConnectionType()
    }
    
    return summary
  }

  // Get metrics for analytics/debugging
  getMetrics() {
    return [...this.metrics] // Return a copy
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = []
  }

  // Export metrics for analysis
  exportMetrics() {
    const summary = this.getPerformanceSummary()
    const data = {
      summary,
      metrics: this.metrics,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    }
    
    return JSON.stringify(data, null, 2)
  }

  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  private getAverageByType(metrics: PerformanceMetric[], type: PerformanceMetric['type']) {
    const typeMetrics = metrics.filter(m => m.type === type)
    if (typeMetrics.length === 0) return 0
    
    const total = typeMetrics.reduce((sum, m) => sum + m.duration, 0)
    return total / typeMetrics.length
  }

  private isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false
    
    const userAgent = navigator.userAgent || navigator.userAgentData?.mobile
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent.toString())
  }

  private getConnectionType(): string {
    if (typeof navigator === 'undefined') return 'unknown'
    
    // @ts-ignore - not all browsers support this yet
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    
    if (!connection) return 'unknown'
    
    return connection.effectiveType || connection.type || 'unknown'
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// React hook for tracking component performance
export function usePerformanceTracking(componentName: string) {
  const startTime = performance.now()
  
  return {
    // Track when component finishes rendering
    trackRender: () => {
      const renderTime = performance.now() - startTime
      performanceMonitor.trackComponentRender(componentName, renderTime)
    },
    
    // Track user interactions within component
    trackInteraction: (action: string, interactionStartTime?: number) => {
      const duration = interactionStartTime 
        ? performance.now() - interactionStartTime 
        : 0
      performanceMonitor.trackUserInteraction(`${componentName}-${action}`, duration)
    }
  }
}

// HOC for automatic performance tracking
export function withPerformanceTracking<T extends {}>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: T) {
    const { trackRender } = usePerformanceTracking(componentName)
    
    React.useEffect(() => {
      trackRender()
    })
    
    return React.createElement(Component, props)
  }
}

// API request wrapper with performance tracking
export async function trackApiRequest<T>(
  requestFn: () => Promise<T>,
  endpoint: string
): Promise<T> {
  const startTime = performance.now()
  
  try {
    const result = await requestFn()
    const duration = performance.now() - startTime
    performanceMonitor.trackApiRequest(endpoint, duration, 200)
    return result
  } catch (error) {
    const duration = performance.now() - startTime
    const status = error instanceof Error && 'status' in error 
      ? (error as any).status 
      : 500
    performanceMonitor.trackApiRequest(endpoint, duration, status)
    throw error
  }
}