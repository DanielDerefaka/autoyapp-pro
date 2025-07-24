import { prisma } from './prisma';

export interface ErrorLog {
  id: string;
  userId?: string;
  userEmail?: string;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ipAddress?: string;
  requestBody?: string;
  responseStatus?: number;
  metadata?: any;
  timestamp: Date;
  resolved: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class ErrorLogger {
  
  /**
   * Log an API error with full context
   */
  static async logApiError({
    error,
    userId,
    userEmail,
    request,
    endpoint,
    method,
    requestBody,
    responseStatus,
    metadata = {}
  }: {
    error: Error;
    userId?: string;
    userEmail?: string;
    request?: any;
    endpoint?: string;
    method?: string;
    requestBody?: any;
    responseStatus?: number;
    metadata?: any;
  }) {
    try {
      await prisma.errorLog.create({
        data: {
          userId,
          userEmail,
          errorType: 'API_ERROR',
          errorMessage: error.message,
          errorStack: error.stack,
          endpoint,
          method,
          userAgent: request?.headers?.get('user-agent'),
          ipAddress: this.getClientIP(request),
          requestBody: requestBody ? JSON.stringify(requestBody) : null,
          responseStatus,
          metadata: JSON.stringify({
            ...metadata,
            timestamp: new Date().toISOString(),
            errorName: error.name,
          }),
          severity: this.determineSeverity(error, responseStatus),
          resolved: false,
        }
      });
    } catch (logError) {
      console.error('Failed to log error to database:', logError);
      // Fallback to console logging
      console.error('Original error:', {
        error: error.message,
        endpoint,
        userId,
        userEmail,
        stack: error.stack
      });
    }
  }

  /**
   * Log a client-side error
   */
  static async logClientError({
    error,
    userId,
    userEmail,
    component,
    action,
    metadata = {}
  }: {
    error: Error | string;
    userId?: string;
    userEmail?: string;
    component?: string;
    action?: string;
    metadata?: any;
  }) {
    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const errorStack = typeof error === 'string' ? undefined : error.stack;

      await prisma.errorLog.create({
        data: {
          userId,
          userEmail,
          errorType: 'CLIENT_ERROR',
          errorMessage,
          errorStack,
          endpoint: component,
          method: action,
          metadata: JSON.stringify({
            ...metadata,
            timestamp: new Date().toISOString(),
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
          }),
          severity: this.determineSeverity(error),
          resolved: false,
        }
      });
    } catch (logError) {
      console.error('Failed to log client error:', logError);
    }
  }

  /**
   * Log authentication errors
   */
  static async logAuthError({
    error,
    userId,
    userEmail,
    authProvider,
    metadata = {}
  }: {
    error: Error | string;
    userId?: string;
    userEmail?: string;
    authProvider?: string;
    metadata?: any;
  }) {
    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      
      await prisma.errorLog.create({
        data: {
          userId,
          userEmail,
          errorType: 'AUTH_ERROR',
          errorMessage,
          errorStack: typeof error === 'string' ? undefined : error.stack,
          metadata: JSON.stringify({
            ...metadata,
            authProvider,
            timestamp: new Date().toISOString(),
          }),
          severity: 'high', // Auth errors are always high priority
          resolved: false,
        }
      });
    } catch (logError) {
      console.error('Failed to log auth error:', logError);
    }
  }

  /**
   * Log system/cron job errors
   */
  static async logSystemError({
    error,
    system,
    operation,
    metadata = {}
  }: {
    error: Error | string;
    system: string;
    operation: string;
    metadata?: any;
  }) {
    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      
      await prisma.errorLog.create({
        data: {
          errorType: 'SYSTEM_ERROR',
          errorMessage,
          errorStack: typeof error === 'string' ? undefined : error.stack,
          endpoint: system,
          method: operation,
          metadata: JSON.stringify({
            ...metadata,
            timestamp: new Date().toISOString(),
          }),
          severity: this.determineSeverity(error),
          resolved: false,
        }
      });
    } catch (logError) {
      console.error('Failed to log system error:', logError);
    }
  }

  /**
   * Log database errors
   */
  static async logDatabaseError({
    error,
    query,
    table,
    userId,
    metadata = {}
  }: {
    error: Error;
    query?: string;
    table?: string;
    userId?: string;
    metadata?: any;
  }) {
    try {
      // For database errors, we'll try to log to console first
      console.error('Database error:', {
        message: error.message,
        query,
        table,
        userId,
        stack: error.stack
      });

      // Then try to log to database (might fail if DB is down)
      await prisma.errorLog.create({
        data: {
          userId,
          errorType: 'DATABASE_ERROR',
          errorMessage: error.message,
          errorStack: error.stack,
          endpoint: table,
          method: query,
          metadata: JSON.stringify({
            ...metadata,
            prismaCode: (error as any).code,
            timestamp: new Date().toISOString(),
          }),
          severity: 'critical',
          resolved: false,
        }
      });
    } catch (logError) {
      console.error('Failed to log database error:', logError);
    }
  }

  /**
   * Determine error severity
   */
  private static determineSeverity(error: Error | string, status?: number): 'low' | 'medium' | 'high' | 'critical' {
    const message = typeof error === 'string' ? error : error.message;
    const lowerMessage = message.toLowerCase();

    // Critical errors
    if (lowerMessage.includes('database') || lowerMessage.includes('connection') || status === 500) {
      return 'critical';
    }

    // High priority errors
    if (lowerMessage.includes('auth') || lowerMessage.includes('unauthorized') || 
        lowerMessage.includes('forbidden') || status === 401 || status === 403) {
      return 'high';
    }

    // Medium priority errors
    if (lowerMessage.includes('not found') || lowerMessage.includes('validation') || 
        status === 404 || status === 400) {
      return 'medium';
    }

    // Default to low
    return 'low';
  }

  /**
   * Get client IP address
   */
  private static getClientIP(request: any): string | undefined {
    if (!request) return undefined;

    // Try various headers for IP address
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return request.headers.get('x-real-ip') || 
           request.headers.get('x-client-ip') || 
           request.ip;
  }

  /**
   * Mark error as resolved
   */
  static async resolveError(errorId: string, resolvedBy?: string) {
    try {
      await prisma.errorLog.update({
        where: { id: errorId },
        data: { 
          resolved: true,
          metadata: {
            resolvedAt: new Date().toISOString(),
            resolvedBy
          }
        }
      });
    } catch (error) {
      console.error('Failed to resolve error:', error);
    }
  }

  /**
   * Get error statistics
   */
  static async getErrorStats(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day') {
    try {
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case 'hour':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const [total, byType, bySeverity, unresolved] = await Promise.all([
        // Total errors
        prisma.errorLog.count({
          where: { timestamp: { gte: startDate } }
        }),
        
        // Errors by type
        prisma.errorLog.groupBy({
          by: ['errorType'],
          where: { timestamp: { gte: startDate } },
          _count: { id: true }
        }),
        
        // Errors by severity
        prisma.errorLog.groupBy({
          by: ['severity'],
          where: { timestamp: { gte: startDate } },
          _count: { id: true }
        }),
        
        // Unresolved errors
        prisma.errorLog.count({
          where: { 
            timestamp: { gte: startDate },
            resolved: false
          }
        })
      ]);

      return {
        total,
        unresolved,
        resolved: total - unresolved,
        byType: byType.reduce((acc, item) => ({
          ...acc,
          [item.errorType]: item._count.id
        }), {}),
        bySeverity: bySeverity.reduce((acc, item) => ({
          ...acc,
          [item.severity]: item._count.id
        }), {})
      };
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return null;
    }
  }
}

// Helper function for API routes
export function withErrorLogging(handler: Function) {
  return async (request: any, ...args: any[]) => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      await ErrorLogger.logApiError({
        error: error as Error,
        request,
        endpoint: request.url,
        method: request.method,
      });
      throw error;
    }
  };
}