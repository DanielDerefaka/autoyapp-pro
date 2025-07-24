import { ErrorLogger } from './error-logger';

interface RateLimit {
  requests: number;
  windowMs: number;
  resetTime: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimit> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    // Twitter API v2 rate limits (per 15-minute window)
    this.setLimit('tweets/post', 300, 15 * 60 * 1000); // 300 posts per 15 minutes
    this.setLimit('tweets/lookup', 300, 15 * 60 * 1000); // 300 requests per 15 minutes
    this.setLimit('users/lookup', 300, 15 * 60 * 1000); // 300 requests per 15 minutes
    this.setLimit('search/recent', 180, 15 * 60 * 1000); // 180 requests per 15 minutes
  }

  private setLimit(endpoint: string, requests: number, windowMs: number) {
    this.limits.set(endpoint, {
      requests,
      windowMs,
      resetTime: Date.now() + windowMs,
    });
  }

  async checkLimit(endpoint: string): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
    const limit = this.limits.get(endpoint);
    if (!limit) {
      // No limit defined, allow request
      return { allowed: true };
    }

    const now = Date.now();
    const key = `${endpoint}:${Math.floor(now / limit.windowMs)}`;
    
    let requestData = this.requestCounts.get(key);
    
    if (!requestData || now >= requestData.resetTime) {
      // Reset window
      requestData = {
        count: 0,
        resetTime: now + limit.windowMs,
      };
      this.requestCounts.set(key, requestData);
    }

    if (requestData.count >= limit.requests) {
      return {
        allowed: false,
        resetTime: requestData.resetTime,
        remaining: 0,
      };
    }

    // Increment count
    requestData.count++;
    this.requestCounts.set(key, requestData);

    return {
      allowed: true,
      remaining: limit.requests - requestData.count,
    };
  }

  async waitForReset(endpoint: string): Promise<void> {
    const limit = this.limits.get(endpoint);
    if (!limit) return;

    const now = Date.now();
    const key = `${endpoint}:${Math.floor(now / limit.windowMs)}`;
    const requestData = this.requestCounts.get(key);

    if (requestData && requestData.resetTime > now) {
      const waitTime = requestData.resetTime - now;
      console.log(`Rate limit hit for ${endpoint}. Waiting ${waitTime}ms until reset...`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  getTimeUntilReset(endpoint: string): number {
    const limit = this.limits.get(endpoint);
    if (!limit) return 0;

    const now = Date.now();
    const key = `${endpoint}:${Math.floor(now / limit.windowMs)}`;
    const requestData = this.requestCounts.get(key);

    if (!requestData) return 0;
    
    return Math.max(0, requestData.resetTime - now);
  }
}

export class RetryHandler {
  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  };

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
    context?: { operation: string; userId?: string }
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError: Error;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          const resetTime = this.extractResetTime(error);
          if (resetTime && attempt < finalConfig.maxRetries) {
            console.log(`Rate limit hit on attempt ${attempt + 1}. Waiting until reset...`);
            await this.waitUntil(resetTime);
            continue;
          }
        }

        // Check if it's a retryable error
        if (!this.isRetryableError(error) || attempt === finalConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
          finalConfig.maxDelay
        );

        console.log(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Log the final error
    if (context) {
      await ErrorLogger.logApiError({
        error: lastError,
        userId: context.userId,
        metadata: {
          operation: context.operation,
          finalAttempt: true,
          totalAttempts: finalConfig.maxRetries + 1,
        },
      });
    }

    throw lastError;
  }

  private isRateLimitError(error: any): boolean {
    if (error?.message?.includes('429')) return true;
    if (error?.status === 429) return true;
    if (error?.message?.toLowerCase().includes('rate limit')) return true;
    if (error?.message?.toLowerCase().includes('too many requests')) return true;
    return false;
  }

  private isRetryableError(error: any): boolean {
    // Rate limit errors are retryable
    if (this.isRateLimitError(error)) return true;
    
    // Server errors (5xx) are retryable
    if (error?.status >= 500 && error?.status < 600) return true;
    if (error?.message?.includes('5')) return true;
    
    // Network errors are retryable
    if (error?.code === 'ECONNRESET') return true;
    if (error?.code === 'ETIMEDOUT') return true;
    if (error?.message?.toLowerCase().includes('network')) return true;
    if (error?.message?.toLowerCase().includes('timeout')) return true;
    
    return false;
  }

  private extractResetTime(error: any): number | null {
    // Try to extract reset time from X-RateLimit-Reset header
    if (error?.headers?.['x-ratelimit-reset']) {
      return parseInt(error.headers['x-ratelimit-reset']) * 1000;
    }
    
    // Default to 15 minutes from now (typical Twitter window)
    return Date.now() + (15 * 60 * 1000);
  }

  private async waitUntil(resetTime: number): Promise<void> {
    const now = Date.now();
    const waitTime = Math.max(0, resetTime - now);
    
    if (waitTime > 0) {
      console.log(`Waiting ${Math.round(waitTime / 1000)}s until rate limit reset...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Global instances
export const rateLimiter = new RateLimiter();
export const retryHandler = new RetryHandler();

// Utility function to wrap API calls with rate limiting and retry logic
export async function withRateLimit<T>(
  endpoint: string,
  operation: () => Promise<T>,
  context?: { operation: string; userId?: string }
): Promise<T> {
  // Check rate limit first
  const limitCheck = await rateLimiter.checkLimit(endpoint);
  
  if (!limitCheck.allowed) {
    console.log(`Rate limit exceeded for ${endpoint}. Waiting for reset...`);
    await rateLimiter.waitForReset(endpoint);
  }

  // Execute with retry logic
  return retryHandler.executeWithRetry(operation, undefined, context);
}

// Specific Twitter API wrappers
export const TwitterRateLimits = {
  async postTweet<T>(operation: () => Promise<T>, userId?: string): Promise<T> {
    return withRateLimit('tweets/post', operation, {
      operation: 'postTweet',
      userId,
    });
  },

  async lookupTweet<T>(operation: () => Promise<T>, userId?: string): Promise<T> {
    return withRateLimit('tweets/lookup', operation, {
      operation: 'lookupTweet',
      userId,
    });
  },

  async lookupUser<T>(operation: () => Promise<T>, userId?: string): Promise<T> {
    return withRateLimit('users/lookup', operation, {
      operation: 'lookupUser',
      userId,
    });
  },

  async searchTweets<T>(operation: () => Promise<T>, userId?: string): Promise<T> {
    return withRateLimit('search/recent', operation, {
      operation: 'searchTweets',
      userId,
    });
  },
};