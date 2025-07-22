/**
 * Query Keys Factory - Centralized and type-safe query key management
 * This ensures consistent caching and prevents cache misses
 */

export const queryKeys = {
  // Authentication
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    xAccounts: () => [...queryKeys.auth.all, 'x-accounts'] as const,
  },

  // Target Users
  targets: {
    all: ['targets'] as const,
    lists: () => [...queryKeys.targets.all, 'list'] as const,
    list: (filters: Record<string, any> = {}) => 
      [...queryKeys.targets.lists(), { ...filters }] as const,
    details: () => [...queryKeys.targets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.targets.details(), id] as const,
  },

  // Tweets
  tweets: {
    all: ['tweets'] as const,
    lists: () => [...queryKeys.tweets.all, 'list'] as const,
    list: (filters: Record<string, any> = {}) => 
      [...queryKeys.tweets.lists(), { ...filters }] as const,
    details: () => [...queryKeys.tweets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tweets.details(), id] as const,
    byTarget: (targetId: string) => 
      [...queryKeys.tweets.all, 'by-target', targetId] as const,
  },

  // Replies & Queue
  replies: {
    all: ['replies'] as const,
    queue: {
      all: () => [...queryKeys.replies.all, 'queue'] as const,
      list: (filters: Record<string, any> = {}) => 
        [...queryKeys.replies.queue.all(), 'list', { ...filters }] as const,
      detail: (id: string) => 
        [...queryKeys.replies.queue.all(), 'detail', id] as const,
    },
    generation: {
      all: () => [...queryKeys.replies.all, 'generation'] as const,
      forTweet: (tweetId: string, context: Record<string, any> = {}) =>
        [...queryKeys.replies.generation.all(), tweetId, { ...context }] as const,
    },
  },

  // Analytics
  analytics: {
    all: ['analytics'] as const,
    engagement: {
      all: () => [...queryKeys.analytics.all, 'engagement'] as const,
      metrics: (params: Record<string, any> = {}) => 
        [...queryKeys.analytics.engagement.all(), 'metrics', { ...params }] as const,
    },
    targets: {
      all: () => [...queryKeys.analytics.all, 'targets'] as const,
      metrics: (params: Record<string, any> = {}) => 
        [...queryKeys.analytics.targets.all(), 'metrics', { ...params }] as const,
    },
    performance: {
      all: () => [...queryKeys.analytics.all, 'performance'] as const,
      metrics: (period: string = 'monthly') => 
        [...queryKeys.analytics.performance.all(), 'metrics', period] as const,
    },
  },

  // Templates
  templates: {
    all: ['templates'] as const,
    lists: () => [...queryKeys.templates.all, 'list'] as const,
    list: (filters: Record<string, any> = {}) => 
      [...queryKeys.templates.lists(), { ...filters }] as const,
    details: () => [...queryKeys.templates.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.templates.details(), id] as const,
  },

  // Scheduled Content
  scheduled: {
    all: ['scheduled'] as const,
    content: {
      all: () => [...queryKeys.scheduled.all, 'content'] as const,
      list: (filters: Record<string, any> = {}) => 
        [...queryKeys.scheduled.content.all(), 'list', { ...filters }] as const,
      detail: (id: string) => 
        [...queryKeys.scheduled.content.all(), 'detail', id] as const,
    },
  },

  // System Status
  system: {
    all: ['system'] as const,
    health: () => [...queryKeys.system.all, 'health'] as const,
    status: {
      all: () => [...queryKeys.system.all, 'status'] as const,
      scraping: () => [...queryKeys.system.status.all(), 'scraping'] as const,
      queue: () => [...queryKeys.system.status.all(), 'queue'] as const,
    },
  },
} as const

/**
 * Query key utility functions
 */
export const queryUtils = {
  // Create stable sort/filter objects to prevent unnecessary cache misses
  normalizeFilters: (filters: Record<string, any>) => {
    const normalized: Record<string, any> = {}
    
    // Sort keys alphabetically for consistency
    Object.keys(filters)
      .sort()
      .forEach(key => {
        const value = filters[key]
        if (value !== undefined && value !== null && value !== '') {
          normalized[key] = value
        }
      })
    
    return normalized
  },

  // Create pagination parameters
  createPaginationKey: (page: number = 1, limit: number = 20) => ({
    page,
    limit,
    offset: (page - 1) * limit,
  }),

  // Create date range parameters
  createDateRangeKey: (startDate?: string, endDate?: string) => {
    const params: Record<string, string> = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    return params
  },
}