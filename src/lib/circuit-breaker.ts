/**
 * Circuit Breaker for Twitter API calls
 * Prevents cascading failures by stopping requests when error rate is too high
 */

interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening circuit
  timeout: number; // Time to wait before trying again (ms)
  monitoringPeriod: number; // Time window for monitoring failures (ms)
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  nextAttempt: number;
}

export class CircuitBreaker {
  private options: CircuitBreakerOptions;
  private state: CircuitBreakerState;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: 5, // Open after 5 failures
      timeout: 60000, // Wait 1 minute before retry
      monitoringPeriod: 300000, // Monitor failures over 5 minutes
      ...options
    };

    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED',
      nextAttempt: 0
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.state === 'OPEN') {
      if (Date.now() < this.state.nextAttempt) {
        throw new Error(`Circuit breaker is OPEN. Next attempt in ${Math.ceil((this.state.nextAttempt - Date.now()) / 1000)} seconds`);
      } else {
        this.state.state = 'HALF_OPEN';
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.state.failures = 0;
    this.state.state = 'CLOSED';
  }

  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failures >= this.options.failureThreshold) {
      this.state.state = 'OPEN';
      this.state.nextAttempt = Date.now() + this.options.timeout;
    }
  }

  getState(): { state: string; failures: number; nextAttempt?: string } {
    return {
      state: this.state.state,
      failures: this.state.failures,
      nextAttempt: this.state.state === 'OPEN' 
        ? new Date(this.state.nextAttempt).toISOString()
        : undefined
    };
  }

  reset(): void {
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED',
      nextAttempt: 0
    };
  }
}

// Global circuit breakers for different operations
export const twitterCircuitBreakers = {
  postTweet: new CircuitBreaker({ failureThreshold: 3, timeout: 120000 }), // 2 minutes
  tokenRefresh: new CircuitBreaker({ failureThreshold: 5, timeout: 300000 }), // 5 minutes
  userLookup: new CircuitBreaker({ failureThreshold: 10, timeout: 60000 }), // 1 minute
};