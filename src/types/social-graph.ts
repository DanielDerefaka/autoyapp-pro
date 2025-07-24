export interface SocialNodeData {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  profileImageUrl?: string;
  followerCount: number;
  followingCount: number;
  tweetCount: number;
  isVerified: boolean;
  accountAge?: number;
  bio?: string;
  location?: string;
  website?: string;
  lastSeen?: Date;
  influenceScore: number;
  engagementRate: number;
  topicAffinity: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialRelationData {
  id: string;
  userId: string;
  fromUserId: string;
  toUserId: string;
  relationType: 'follows' | 'mentions' | 'replies' | 'quotes' | 'retweets';
  strength: number;
  frequency: number;
  reciprocal: boolean;
  lastInteraction?: Date;
  sentimentScore: number;
  topicOverlap: number;
  influenceFlow: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialInteractionData {
  id: string;
  userId: string;
  nodeId: string;
  interactionType: 'like' | 'reply' | 'retweet' | 'quote' | 'mention';
  tweetId?: string;
  content?: string;
  sentimentScore: number;
  engagementLevel: 'low' | 'medium' | 'high';
  timestamp: Date;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface SocialClusterData {
  id: string;
  userId: string;
  nodeId: string;
  clusterId: string;
  clusterName?: string;
  centrality: number;
  topics: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InfluencePathData {
  id: string;
  userId: string;
  sourceNodeId: string;
  targetNodeId: string;
  pathLength: number;
  influenceScore: number;
  pathNodes: string[];
  topics: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialGraphAnalysis {
  networkSize: number;
  averagePathLength: number;
  clusteringCoefficient: number;
  centralityMeasures: {
    betweenness: Record<string, number>;
    closeness: Record<string, number>;
    eigenvector: Record<string, number>;
    pageRank: Record<string, number>;
  };
  communities: {
    clusterId: string;
    name: string;
    nodes: string[];
    topics: string[];
    centralNode: string;
    density: number;
  }[];
  influenceRankings: {
    nodeId: string;
    username: string;
    score: number;
    rank: number;
  }[];
}

export interface NetworkMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  diameter: number;
  averageDegree: number;
  mostInfluential: {
    nodeId: string;
    username: string;
    score: number;
  };
  topCommunities: {
    id: string;
    name: string;
    size: number;
    topics: string[];
  }[];
}

export interface EngagementOpportunity {
  targetNodeId: string;
  targetUsername: string;
  opportunityType: 'direct_reply' | 'bridge_connection' | 'community_entry' | 'influence_path';
  description: string;
  potentialReach: number;
  confidenceScore: number;
  suggestedContent?: string;
  timing?: {
    bestHours: number[];
    timeZone: string;
  };
  context: {
    recentTopics: string[];
    connectionPath?: string[];
    mutualConnections?: string[];
  };
}

export interface SocialGraphRequest {
  userId: string;
  targetUsernames?: string[];
  analysisType: 'full' | 'relationships' | 'influence' | 'communities';
  maxDepth?: number;
  includeMetrics?: boolean;
}

export interface SocialGraphResponse {
  analysis: SocialGraphAnalysis;
  metrics: NetworkMetrics;
  opportunities: EngagementOpportunity[];
  lastUpdated: Date;
  analysisVersion: string;
}