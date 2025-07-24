import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  SocialGraphResponse, 
  SocialNodeData, 
  EngagementOpportunity,
  SocialGraphRequest 
} from '@/types/social-graph';

const apiRequest = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response.json();
};

// Social Graph Analysis
export const useSocialGraphAnalysis = (request?: Partial<SocialGraphRequest>) => {
  return useQuery({
    queryKey: ['social-graph', 'analysis', request],
    queryFn: () => apiRequest('/api/social-graph/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request || {}),
    }),
    enabled: !!request,
    staleTime: 10 * 60 * 1000, // 10 minutes - social graph doesn't change rapidly
    refetchInterval: false, // Don't auto-refetch expensive operations
  });
};

export const useSocialGraphSummary = () => {
  return useQuery({
    queryKey: ['social-graph', 'summary'],
    queryFn: () => apiRequest('/api/social-graph/analyze'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Social Nodes
export const useSocialNodes = (params?: {
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}) => {
  const query = new URLSearchParams();
  
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.order) query.set('order', params.order);

  return useQuery({
    queryKey: ['social-graph', 'nodes', params],
    queryFn: () => apiRequest(`/api/social-graph/nodes?${query.toString()}`),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateSocialNode = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (nodeData: {
      username: string;
      displayName?: string;
      profileImageUrl?: string;
      followerCount?: number;
      followingCount?: number;
      tweetCount?: number;
      isVerified?: boolean;
      bio?: string;
      location?: string;
      website?: string;
    }) =>
      apiRequest('/api/social-graph/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nodeData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-graph', 'nodes'] });
      queryClient.invalidateQueries({ queryKey: ['social-graph', 'summary'] });
      toast.success('Social node created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create social node: ${error.message}`);
    },
  });
};

// Social Interactions
export const useSocialInteractions = (params?: {
  limit?: number;
  offset?: number;
  interactionType?: string;
  nodeId?: string;
}) => {
  const query = new URLSearchParams();
  
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());
  if (params?.interactionType) query.set('interactionType', params.interactionType);
  if (params?.nodeId) query.set('nodeId', params.nodeId);

  return useQuery({
    queryKey: ['social-graph', 'interactions', params],
    queryFn: () => apiRequest(`/api/social-graph/interactions?${query.toString()}`),
    staleTime: 1 * 60 * 1000, // 1 minute - interactions are more dynamic
  });
};

export const useRecordInteraction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (interactionData: {
      sourceUsername: string;
      targetUsername: string;
      interactionType: 'like' | 'reply' | 'retweet' | 'quote' | 'mention';
      tweetId?: string;
      content?: string;
      sentimentScore?: number;
      timestamp: string;
    }) =>
      apiRequest('/api/social-graph/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interactionData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-graph', 'interactions'] });
      queryClient.invalidateQueries({ queryKey: ['social-graph', 'nodes'] });
      queryClient.invalidateQueries({ queryKey: ['social-graph', 'analysis'] });
    },
    onError: (error: Error) => {
      console.error('Failed to record interaction:', error.message);
      // Don't show toast for interactions - they happen frequently and silently
    },
  });
};

// Engagement Opportunities
export const useEngagementOpportunities = (params?: {
  type?: string;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  
  if (params?.type) query.set('type', params.type);
  if (params?.limit) query.set('limit', params.limit.toString());

  return useQuery({
    queryKey: ['social-graph', 'opportunities', params],
    queryFn: () => apiRequest(`/api/social-graph/opportunities?${query.toString()}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Analyze Social Graph Hook
export const useAnalyzeSocialGraph = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: Partial<SocialGraphRequest>) =>
      apiRequest('/api/social-graph/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-graph'] });
      toast.success('Social graph analysis completed');
    },
    onError: (error: Error) => {
      toast.error(`Analysis failed: ${error.message}`);
    },
  });
};

// Utility hooks for specific social graph features
export const useInfluenceRankings = () => {
  return useQuery({
    queryKey: ['social-graph', 'influence-rankings'],
    queryFn: async () => {
      const response = await apiRequest('/api/social-graph/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisType: 'influence' }),
      });
      return response.analysis.influenceRankings;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCommunityDetection = () => {
  return useQuery({
    queryKey: ['social-graph', 'communities'],
    queryFn: async () => {
      const response = await apiRequest('/api/social-graph/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisType: 'communities' }),
      });
      return response.analysis.communities;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - communities change slowly
  });
};

export const useNetworkMetrics = () => {
  return useQuery({
    queryKey: ['social-graph', 'metrics'],
    queryFn: async () => {
      const response = await apiRequest('/api/social-graph/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeMetrics: true }),
      });
      return response.metrics;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Helper hooks for integration with existing features
export const useSocialGraphForTargets = (targetUsernames: string[]) => {
  return useQuery({
    queryKey: ['social-graph', 'targets', targetUsernames],
    queryFn: () => apiRequest('/api/social-graph/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        targetUsernames,
        analysisType: 'relationships',
        maxDepth: 2,
      }),
    }),
    enabled: targetUsernames.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

export const useBridgeConnections = (targetUsername: string) => {
  return useQuery({
    queryKey: ['social-graph', 'bridges', targetUsername],
    queryFn: async () => {
      const response = await apiRequest('/api/social-graph/opportunities?type=bridge_connection&limit=10');
      return response.data.filter((opp: EngagementOpportunity) => 
        opp.context.connectionPath?.includes(targetUsername)
      );
    },
    enabled: !!targetUsername,
    staleTime: 10 * 60 * 1000,
  });
};

// Seed Social Graph Hook
export const useSeedSocialGraph = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () =>
      apiRequest('/api/social-graph/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social-graph'] });
      toast.success(`Social graph seeded! ${data.summary.nodesCreated} nodes and ${data.summary.interactionsCreated} interactions created.`);
    },
    onError: (error: any) => {
      if (error.message.includes('No target users found')) {
        toast.error('Please add some target users first before seeding the social graph.');
      } else {
        toast.error(`Failed to seed social graph: ${error.message}`);
      }
    },
  });
};