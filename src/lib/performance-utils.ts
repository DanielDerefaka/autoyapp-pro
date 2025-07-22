/**
 * Performance utilities for measuring and optimizing app performance
 */

interface PerformanceEntry {
  name: string
  startTime: number
  duration: number
  details?: Record<string, any>
}

class PerformanceTracker {
  private entries: PerformanceEntry[] = []
  private activeTimers: Map<string, number> = new Map()

  start(name: string, details?: Record<string, any>) {
    const startTime = performance.now()
    this.activeTimers.set(name, startTime)
    
    if (details) {
      console.log(`🚀 Starting: ${name}`, details)
    }
  }

  end(name: string): PerformanceEntry | null {
    const endTime = performance.now()
    const startTime = this.activeTimers.get(name)
    
    if (!startTime) {
      console.warn(`⚠️  No start time found for: ${name}`)
      return null
    }

    const duration = endTime - startTime
    const entry: PerformanceEntry = {
      name,
      startTime,
      duration,
    }

    this.entries.push(entry)
    this.activeTimers.delete(name)

    // Log slow operations
    if (duration > 1000) {
      console.warn(`🐌 Slow operation: ${name} took ${duration.toFixed(2)}ms`)
    } else {
      console.log(`✅ Completed: ${name} in ${duration.toFixed(2)}ms`)
    }

    return entry
  }

  measure<T>(name: string, fn: () => T, details?: Record<string, any>): T {
    this.start(name, details)
    try {
      const result = fn()
      this.end(name)
      return result
    } catch (error) {
      this.end(name)
      throw error
    }
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>, details?: Record<string, any>): Promise<T> {
    this.start(name, details)
    try {
      const result = await fn()
      this.end(name)
      return result
    } catch (error) {
      this.end(name)
      throw error
    }
  }

  getEntries(nameFilter?: string): PerformanceEntry[] {
    return nameFilter 
      ? this.entries.filter(entry => entry.name.includes(nameFilter))
      : [...this.entries]
  }

  getAverageTime(nameFilter: string): number {
    const filtered = this.getEntries(nameFilter)
    if (filtered.length === 0) return 0
    
    const total = filtered.reduce((sum, entry) => sum + entry.duration, 0)
    return total / filtered.length
  }

  getSlowestOperations(limit: number = 10): PerformanceEntry[] {
    return [...this.entries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }

  clear() {
    this.entries = []
    this.activeTimers.clear()
  }

  report(nameFilter?: string) {
    const entries = this.getEntries(nameFilter)
    const avgTime = nameFilter ? this.getAverageTime(nameFilter) : 0
    
    console.group(`📊 Performance Report${nameFilter ? ` (${nameFilter})` : ''}`)
    console.log(`Total Operations: ${entries.length}`)
    
    if (nameFilter) {
      console.log(`Average Time: ${avgTime.toFixed(2)}ms`)
    }
    
    const slowest = entries.slice().sort((a, b) => b.duration - a.duration).slice(0, 5)
    if (slowest.length > 0) {
      console.log('Slowest Operations:')
      slowest.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.name}: ${entry.duration.toFixed(2)}ms`)
      })
    }
    
    console.groupEnd()
  }
}

// Global performance tracker instance
export const perf = new PerformanceTracker()

/**
 * React Query performance measurement utilities
 */
export const queryPerf = {
  measureQuery: <T>(queryKey: any[], queryFn: () => Promise<T>) => {
    const name = `Query: ${JSON.stringify(queryKey).slice(0, 50)}...`
    return perf.measureAsync(name, queryFn, { queryKey })
  },

  measureMutation: <T>(mutationName: string, mutationFn: () => Promise<T>) => {
    const name = `Mutation: ${mutationName}`
    return perf.measureAsync(name, mutationFn, { type: 'mutation' })
  },
}

/**
 * API performance utilities
 */
export const apiPerf = {
  measureApiCall: async <T>(url: string, options?: RequestInit): Promise<T> => {
    const name = `API: ${url.split('?')[0]}`
    
    return perf.measureAsync(name, async () => {
      const response = await fetch(url, options)
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }
      return response.json()
    }, { url, method: options?.method || 'GET' })
  },
}

/**
 * Component render performance utilities
 */
export const componentPerf = {
  measureRender: (componentName: string, renderFn: () => void) => {
    return perf.measure(`Render: ${componentName}`, renderFn)
  },

  measureEffect: (effectName: string, effectFn: () => void | (() => void)) => {
    return perf.measure(`Effect: ${effectName}`, effectFn)
  },
}

/**
 * Performance monitoring hook
 */
export interface PerformanceReport {
  totalOperations: number
  averageQueryTime: number
  averageApiTime: number
  slowestOperations: PerformanceEntry[]
  recentErrors: string[]
}

export function generatePerformanceReport(): PerformanceReport {
  const allEntries = perf.getEntries()
  const queryEntries = perf.getEntries('Query:')
  const apiEntries = perf.getEntries('API:')
  
  return {
    totalOperations: allEntries.length,
    averageQueryTime: perf.getAverageTime('Query:'),
    averageApiTime: perf.getAverageTime('API:'),
    slowestOperations: perf.getSlowestOperations(10),
    recentErrors: [], // Could be populated from error tracking
  }
}

/**
 * Performance budget checker
 */
export const performanceBudget = {
  // Performance budgets in milliseconds
  budgets: {
    queryTime: 500,      // Queries should complete in < 500ms
    apiCall: 1000,       // API calls should complete in < 1s
    renderTime: 16,      // Renders should complete in < 16ms (60fps)
    mutationTime: 2000,  // Mutations should complete in < 2s
  },

  checkBudget: (entry: PerformanceEntry): boolean => {
    if (entry.name.startsWith('Query:')) {
      return entry.duration <= performanceBudget.budgets.queryTime
    }
    if (entry.name.startsWith('API:')) {
      return entry.duration <= performanceBudget.budgets.apiCall
    }
    if (entry.name.startsWith('Render:')) {
      return entry.duration <= performanceBudget.budgets.renderTime
    }
    if (entry.name.startsWith('Mutation:')) {
      return entry.duration <= performanceBudget.budgets.mutationTime
    }
    return true
  },

  getBudgetViolations: (): PerformanceEntry[] => {
    return perf.getEntries().filter(entry => !performanceBudget.checkBudget(entry))
  },

  reportBudgetViolations: () => {
    const violations = performanceBudget.getBudgetViolations()
    if (violations.length === 0) {
      console.log('✅ All operations within performance budget')
      return
    }

    console.group('⚠️  Performance Budget Violations')
    violations.forEach(violation => {
      const budget = performanceBudget.budgets[violation.name.split(':')[0].toLowerCase() as keyof typeof performanceBudget.budgets]
      console.warn(`${violation.name}: ${violation.duration.toFixed(2)}ms (budget: ${budget}ms)`)
    })
    console.groupEnd()
  },
}

// Auto-report performance violations in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    performanceBudget.reportBudgetViolations()
  }, 30000) // Report every 30 seconds
}