import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const apiRequest = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response.json();
};

export const useErrorLogs = (params?: {
  limit?: number;
  offset?: number;
  errorType?: string;
  severity?: string;
  resolved?: string;
  timeRange?: string;
  search?: string;
}) => {
  const query = new URLSearchParams();
  
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());
  if (params?.errorType && params.errorType !== 'all') query.set('errorType', params.errorType);
  if (params?.severity && params.severity !== 'all') query.set('severity', params.severity);
  if (params?.resolved && params.resolved !== 'all') query.set('resolved', params.resolved);
  if (params?.timeRange) query.set('timeRange', params.timeRange);
  if (params?.search) query.set('search', params.search);

  return useQuery({
    queryKey: ['error-logs', params],
    queryFn: () => apiRequest(`/api/error-logs?${query.toString()}`),
    staleTime: 30 * 1000, // 30 seconds - errors are time-sensitive
    refetchInterval: 60 * 1000, // Refresh every minute
  });
};

export const useErrorLog = (id: string) => {
  return useQuery({
    queryKey: ['error-log', id],
    queryFn: () => apiRequest(`/api/error-logs/${id}`),
    enabled: !!id,
  });
};

export const useResolveError = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      apiRequest(`/api/error-logs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      toast.success('Error status updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update error: ${error.message}`);
    },
  });
};

export const useDeleteError = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/error-logs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      toast.success('Error log deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete error: ${error.message}`);
    },
  });
};

export const useLogClientError = () => {
  return useMutation({
    mutationFn: (errorData: {
      errorType: string;
      errorMessage: string;
      errorStack?: string;
      component?: string;
      action?: string;
      metadata?: Record<string, any>;
    }) =>
      apiRequest('/api/error-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      }),
    onError: (error: Error) => {
      console.error('Failed to log client error:', error);
    },
  });
};

// Error logging utilities
export const logError = (error: Error, component?: string, action?: string, metadata?: Record<string, any>) => {
  // Log to console immediately
  console.error('Error in component:', {
    error: error.message,
    component,
    action,
    stack: error.stack,
    metadata
  });

  // Try to log to server
  try {
    fetch('/api/error-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorType: 'CLIENT_ERROR',
        errorMessage: error.message,
        errorStack: error.stack,
        component,
        action,
        metadata: {
          ...metadata,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
      }),
    }).catch(logError => {
      console.error('Failed to send error to server:', logError);
    });
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
};

// React Error Boundary compatible logger
export const logReactError = (error: Error, errorInfo: { componentStack: string }) => {
  logError(error, 'React Error Boundary', 'componentDidCatch', {
    componentStack: errorInfo.componentStack,
    errorBoundary: true,
  });
};