import { prisma } from '@/lib/prisma';
import { ErrorLogger } from '@/lib/error-logger';
import { 
  SocialNodeData, 
  SocialRelationData, 
  SocialGraphAnalysis, 
  NetworkMetrics,
  EngagementOpportunity,
  SocialGraphRequest,
  SocialGraphResponse
} from '@/types/social-graph';

export class SocialGraphAnalyzer {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Main analysis method - builds and analyzes the social graph
   */
  async analyzeSocialGraph(request: SocialGraphRequest): Promise<SocialGraphResponse> {
    try {
      console.log('Starting social graph analysis for user:', this.userId);

      // Step 1: Build the graph from available data
      const { nodes, relations } = await this.buildGraph(request);

      // Step 2: Calculate network metrics
      const metrics = await this.calculateNetworkMetrics(nodes, relations);

      // Step 3: Perform centrality analysis
      const centralityMeasures = await this.calculateCentralityMeasures(nodes, relations);

      // Step 4: Detect communities
      const communities = await this.detectCommunities(nodes, relations);

      // Step 5: Calculate influence rankings
      const influenceRankings = await this.calculateInfluenceRankings(nodes, relations);

      // Step 6: Find engagement opportunities
      const opportunities = await this.identifyEngagementOpportunities(nodes, relations, communities);

      const analysis: SocialGraphAnalysis = {
        networkSize: nodes.length,
        averagePathLength: this.calculateAveragePathLength(nodes, relations),
        clusteringCoefficient: this.calculateClusteringCoefficient(nodes, relations),
        centralityMeasures,
        communities,
        influenceRankings,
      };

      return {
        analysis,
        metrics,
        opportunities,
        lastUpdated: new Date(),
        analysisVersion: '1.0.0',
      };

    } catch (error) {
      await ErrorLogger.logSystemError({
        error: error as Error,
        userId: this.userId,
        metadata: { request, component: 'SocialGraphAnalyzer' },
      });
      throw error;
    }
  }

  /**
   * Build the social graph from database records
   */
  private async buildGraph(request: SocialGraphRequest): Promise<{
    nodes: SocialNodeData[];
    relations: SocialRelationData[];
  }> {
    // Get nodes (users in the network)
    const nodes = await prisma.socialNode.findMany({
      where: { userId: this.userId },
      include: {
        outgoingRelations: true,
        incomingRelations: true,
        interactions: {
          take: 100,
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    // Get relations between nodes
    const relations = await prisma.socialRelation.findMany({
      where: { userId: this.userId },
      include: {
        fromUser: true,
        toUser: true,
      },
    });

    return {
      nodes: nodes.map(node => ({
        ...node,
        topicAffinity: JSON.parse(node.topicAffinity),
      })),
      relations: relations.map(relation => ({
        ...relation,
        metadata: JSON.parse(relation.metadata),
      })),
    };
  }

  /**
   * Calculate basic network metrics
   */
  private async calculateNetworkMetrics(
    nodes: SocialNodeData[],
    relations: SocialRelationData[]
  ): Promise<NetworkMetrics> {
    const nodeCount = nodes.length;
    const edgeCount = relations.length;
    
    // Network density = actual edges / possible edges
    const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    // Average degree
    const averageDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;

    // Most influential node
    const mostInfluential = nodes
      .sort((a, b) => b.influenceScore - a.influenceScore)[0];

    // Get top communities
    const topCommunities = await this.getTopCommunities();

    return {
      nodeCount,
      edgeCount,
      density,
      diameter: await this.calculateNetworkDiameter(nodes, relations),
      averageDegree,
      mostInfluential: mostInfluential ? {
        nodeId: mostInfluential.id,
        username: mostInfluential.username,
        score: mostInfluential.influenceScore,
      } : { nodeId: '', username: '', score: 0 },
      topCommunities,
    };
  }

  /**
   * Calculate centrality measures for all nodes
   */
  private async calculateCentralityMeasures(
    nodes: SocialNodeData[],
    relations: SocialRelationData[]
  ) {
    // Build adjacency list for calculations
    const adjacencyList = this.buildAdjacencyList(nodes, relations);

    return {
      betweenness: this.calculateBetweennessCentrality(nodes, adjacencyList),
      closeness: this.calculateClosenessCentrality(nodes, adjacencyList),
      eigenvector: this.calculateEigenvectorCentrality(nodes, adjacencyList),
      pageRank: this.calculatePageRank(nodes, adjacencyList),
    };
  }

  /**
   * Detect communities using modularity-based clustering
   */
  private async detectCommunities(
    nodes: SocialNodeData[],
    relations: SocialRelationData[]
  ) {
    // Simple community detection based on shared connections and topics
    const communities = new Map<string, {
      nodes: Set<string>;
      topics: Set<string>;
      totalStrength: number;
    }>();

    // Group nodes by topic affinity and connection patterns
    for (const node of nodes) {
      const topTopics = Object.entries(node.topicAffinity)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([topic]) => topic);

      const communityId = topTopics.join('_') || 'general';
      
      if (!communities.has(communityId)) {
        communities.set(communityId, {
          nodes: new Set(),
          topics: new Set(topTopics),
          totalStrength: 0,
        });
      }

      communities.get(communityId)!.nodes.add(node.id);
    }

    // Convert to final format
    return Array.from(communities.entries()).map(([clusterId, data]) => {
      const clusterNodes = Array.from(data.nodes);
      const centrality = this.findCentralNode(clusterNodes, relations);
      
      return {
        clusterId,
        name: this.generateCommunityName(Array.from(data.topics)),
        nodes: clusterNodes,
        topics: Array.from(data.topics),
        centralNode: centrality.nodeId,
        density: this.calculateClusterDensity(clusterNodes, relations),
      };
    });
  }

  /**
   * Calculate influence rankings using PageRank-like algorithm
   */
  private async calculateInfluenceRankings(
    nodes: SocialNodeData[],
    relations: SocialRelationData[]
  ) {
    const adjacencyList = this.buildAdjacencyList(nodes, relations);
    const pageRankScores = this.calculatePageRank(nodes, adjacencyList);

    return Object.entries(pageRankScores)
      .map(([nodeId, score]) => {
        const node = nodes.find(n => n.id === nodeId);
        return {
          nodeId,
          username: node?.username || '',
          score,
          rank: 0, // Will be set after sorting
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  /**
   * Identify engagement opportunities
   */
  private async identifyEngagementOpportunities(
    nodes: SocialNodeData[],
    relations: SocialRelationData[],
    communities: any[]
  ): Promise<EngagementOpportunity[]> {
    const opportunities: EngagementOpportunity[] = [];

    // 1. Direct reply opportunities - high influence nodes
    const highInfluenceNodes = nodes
      .filter(node => node.influenceScore > 0.7)
      .slice(0, 10);

    for (const node of highInfluenceNodes) {
      opportunities.push({
        targetNodeId: node.id,
        targetUsername: node.username,
        opportunityType: 'direct_reply',
        description: `High-influence user with ${node.followerCount} followers`,
        potentialReach: node.followerCount * node.engagementRate,
        confidenceScore: node.influenceScore,
        context: {
          recentTopics: Object.keys(node.topicAffinity).slice(0, 3),
        },
      });
    }

    // 2. Bridge connections - users who connect different communities
    const bridgeNodes = this.findBridgeNodes(nodes, relations, communities);
    for (const bridge of bridgeNodes) {
      opportunities.push({
        targetNodeId: bridge.nodeId,
        targetUsername: bridge.username,
        opportunityType: 'bridge_connection',
        description: `Connects ${bridge.communities.length} different communities`,
        potentialReach: bridge.totalReach,
        confidenceScore: bridge.bridgeScore,
        context: {
          recentTopics: bridge.topics,
        },
      });
    }

    // 3. Community entry points
    for (const community of communities.slice(0, 5)) {
      const entryNode = nodes.find(n => n.id === community.centralNode);
      if (entryNode) {
        opportunities.push({
          targetNodeId: entryNode.id,
          targetUsername: entryNode.username,
          opportunityType: 'community_entry',
          description: `Central node in ${community.name} community`,
          potentialReach: community.nodes.length * 100, // Estimated
          confidenceScore: 0.8,
          context: {
            recentTopics: community.topics,
          },
        });
      }
    }

    return opportunities.sort((a, b) => b.potentialReach - a.potentialReach);
  }

  // Helper methods
  private buildAdjacencyList(nodes: SocialNodeData[], relations: SocialRelationData[]) {
    const adjacencyList: Record<string, { nodeId: string; weight: number }[]> = {};
    
    // Initialize
    for (const node of nodes) {
      adjacencyList[node.id] = [];
    }

    // Add edges
    for (const relation of relations) {
      adjacencyList[relation.fromUserId].push({
        nodeId: relation.toUserId,
        weight: relation.strength,
      });
      
      if (relation.reciprocal) {
        adjacencyList[relation.toUserId].push({
          nodeId: relation.fromUserId,
          weight: relation.strength,
        });
      }
    }

    return adjacencyList;
  }

  private calculateAveragePathLength(nodes: SocialNodeData[], relations: SocialRelationData[]): number {
    // Simplified calculation - would need full shortest path algorithm for accuracy
    return 3.5; // Typical for social networks
  }

  private calculateClusteringCoefficient(nodes: SocialNodeData[], relations: SocialRelationData[]): number {
    // Simplified calculation
    return 0.3; // Typical for social networks
  }

  private calculateNetworkDiameter(nodes: SocialNodeData[], relations: SocialRelationData[]): Promise<number> {
    // Would implement Floyd-Warshall or BFS for exact calculation
    return Promise.resolve(6); // Six degrees of separation
  }

  private async getTopCommunities() {
    const clusters = await prisma.socialCluster.groupBy({
      by: ['clusterId'],
      where: { userId: this.userId },
      _count: { nodeId: true },
      orderBy: { _count: { nodeId: 'desc' } },
      take: 5,
    });

    return clusters.map(cluster => ({
      id: cluster.clusterId,
      name: cluster.clusterId.replace('_', ' '),
      size: cluster._count.nodeId,
      topics: [], // Would get from cluster data
    }));
  }

  private calculateBetweennessCentrality(nodes: SocialNodeData[], adjacencyList: any): Record<string, number> {
    // Simplified betweenness centrality calculation
    const centrality: Record<string, number> = {};
    nodes.forEach(node => {
      centrality[node.id] = Math.random() * 0.5; // Placeholder
    });
    return centrality;
  }

  private calculateClosenessCentrality(nodes: SocialNodeData[], adjacencyList: any): Record<string, number> {
    // Simplified closeness centrality calculation
    const centrality: Record<string, number> = {};
    nodes.forEach(node => {
      centrality[node.id] = Math.random() * 0.8; // Placeholder
    });
    return centrality;
  }

  private calculateEigenvectorCentrality(nodes: SocialNodeData[], adjacencyList: any): Record<string, number> {
    // Simplified eigenvector centrality calculation
    const centrality: Record<string, number> = {};
    nodes.forEach(node => {
      centrality[node.id] = node.influenceScore * 0.9; // Use existing influence score
    });
    return centrality;
  }

  private calculatePageRank(nodes: SocialNodeData[], adjacencyList: any): Record<string, number> {
    const damping = 0.85;
    const iterations = 100;
    const pageRank: Record<string, number> = {};
    
    // Initialize
    const initialValue = 1.0 / nodes.length;
    nodes.forEach(node => {
      pageRank[node.id] = initialValue;
    });

    // Iterate
    for (let i = 0; i < iterations; i++) {
      const newPageRank: Record<string, number> = {};
      
      for (const node of nodes) {
        newPageRank[node.id] = (1 - damping) / nodes.length;
        
        // Add contributions from incoming links
        for (const otherNode of nodes) {
          const connections = adjacencyList[otherNode.id] || [];
          const outDegree = connections.length;
          
          if (outDegree > 0 && connections.some(conn => conn.nodeId === node.id)) {
            newPageRank[node.id] += damping * (pageRank[otherNode.id] / outDegree);
          }
        }
      }
      
      Object.assign(pageRank, newPageRank);
    }

    return pageRank;
  }

  private findCentralNode(clusterNodes: string[], relations: SocialRelationData[]) {
    // Find node with most connections within the cluster
    const connections: Record<string, number> = {};
    
    clusterNodes.forEach(nodeId => {
      connections[nodeId] = 0;
    });

    relations.forEach(relation => {
      if (clusterNodes.includes(relation.fromUserId) && clusterNodes.includes(relation.toUserId)) {
        connections[relation.fromUserId]++;
        connections[relation.toUserId]++;
      }
    });

    const centralNodeId = Object.entries(connections)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || clusterNodes[0];

    return { nodeId: centralNodeId };
  }

  private calculateClusterDensity(clusterNodes: string[], relations: SocialRelationData[]): number {
    const n = clusterNodes.length;
    if (n < 2) return 0;

    const maxPossibleEdges = n * (n - 1) / 2;
    const actualEdges = relations.filter(r => 
      clusterNodes.includes(r.fromUserId) && clusterNodes.includes(r.toUserId)
    ).length;

    return actualEdges / maxPossibleEdges;
  }

  private generateCommunityName(topics: string[]): string {
    if (topics.length === 0) return 'General Community';
    return topics.slice(0, 2).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' & ') + ' Community';
  }

  private findBridgeNodes(nodes: SocialNodeData[], relations: SocialRelationData[], communities: any[]) {
    const bridgeNodes: any[] = [];
    
    for (const node of nodes) {
      const connectedCommunities = communities.filter(c => 
        c.nodes.includes(node.id) ||
        relations.some(r => 
          (r.fromUserId === node.id && c.nodes.includes(r.toUserId)) ||
          (r.toUserId === node.id && c.nodes.includes(r.fromUserId))
        )
      );

      if (connectedCommunities.length >= 2) {
        bridgeNodes.push({
          nodeId: node.id,
          username: node.username,
          communities: connectedCommunities,
          totalReach: node.followerCount,
          bridgeScore: connectedCommunities.length / communities.length,
          topics: [...new Set(connectedCommunities.flatMap(c => c.topics))],
        });
      }
    }

    return bridgeNodes;
  }

  /**
   * Create or update a social node from Twitter user data
   */
  async createOrUpdateNode(userData: {
    username: string;
    displayName?: string;
    profileImageUrl?: string;
    followerCount: number;
    followingCount: number;
    tweetCount: number;
    isVerified: boolean;
    bio?: string;
    location?: string;
    website?: string;
  }): Promise<SocialNodeData> {
    const existingNode = await prisma.socialNode.findUnique({
      where: { username: userData.username },
    });

    const nodeData = {
      userId: this.userId,
      username: userData.username,
      displayName: userData.displayName,
      profileImageUrl: userData.profileImageUrl,
      followerCount: userData.followerCount,
      followingCount: userData.followingCount,
      tweetCount: userData.tweetCount,
      isVerified: userData.isVerified,
      bio: userData.bio,
      location: userData.location,
      website: userData.website,
      lastSeen: new Date(),
      engagementRate: userData.followerCount > 0 ? Math.min(userData.tweetCount / userData.followerCount * 100, 10) : 0,
    };

    if (existingNode) {
      const updated = await prisma.socialNode.update({
        where: { id: existingNode.id },
        data: nodeData,
      });
      return { ...updated, topicAffinity: JSON.parse(updated.topicAffinity) };
    } else {
      const created = await prisma.socialNode.create({
        data: nodeData,
      });
      return { ...created, topicAffinity: JSON.parse(created.topicAffinity) };
    }
  }

  /**
   * Record an interaction between nodes
   */
  async recordInteraction(data: {
    sourceUsername: string;
    targetUsername: string;
    interactionType: 'like' | 'reply' | 'retweet' | 'quote' | 'mention';
    tweetId?: string;
    content?: string;
    sentimentScore?: number;
    timestamp: Date;
  }) {
    // Get or create source and target nodes
    const [sourceNode, targetNode] = await Promise.all([
      prisma.socialNode.findUnique({ where: { username: data.sourceUsername } }),
      prisma.socialNode.findUnique({ where: { username: data.targetUsername } }),
    ]);

    if (!sourceNode || !targetNode) {
      console.warn(`Missing nodes for interaction: ${data.sourceUsername} -> ${data.targetUsername}`);
      return;
    }

    // Record the interaction
    await prisma.socialInteraction.create({
      data: {
        userId: this.userId,
        nodeId: targetNode.id,
        interactionType: data.interactionType,
        tweetId: data.tweetId,
        content: data.content,
        sentimentScore: data.sentimentScore || 0,
        engagementLevel: this.calculateEngagementLevel(data.sentimentScore || 0),
        timestamp: data.timestamp,
        metadata: JSON.stringify({
          sourceNodeId: sourceNode.id,
          sourceUsername: data.sourceUsername,
        }),
      },
    });

    // Update or create the relationship
    await this.updateRelationship({
      fromUserId: sourceNode.id,
      toUserId: targetNode.id,
      relationType: data.interactionType,
      sentimentScore: data.sentimentScore || 0,
    });
  }

  private async updateRelationship(data: {
    fromUserId: string;
    toUserId: string;
    relationType: string;
    sentimentScore: number;
  }) {
    const existing = await prisma.socialRelation.findUnique({
      where: {
        fromUserId_toUserId_relationType: {
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          relationType: data.relationType,
        },
      },
    });

    if (existing) {
      // Update existing relationship
      await prisma.socialRelation.update({
        where: { id: existing.id },
        data: {
          frequency: existing.frequency + 1,
          lastInteraction: new Date(),
          sentimentScore: (existing.sentimentScore + data.sentimentScore) / 2,
          strength: Math.min(existing.strength + 0.1, 1.0),
        },
      });
    } else {
      // Create new relationship
      await prisma.socialRelation.create({
        data: {
          userId: this.userId,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          relationType: data.relationType,
          strength: 0.1,
          frequency: 1,
          lastInteraction: new Date(),
          sentimentScore: data.sentimentScore,
        },
      });
    }
  }

  private calculateEngagementLevel(sentimentScore: number): 'low' | 'medium' | 'high' {
    const absScore = Math.abs(sentimentScore);
    if (absScore > 0.7) return 'high';
    if (absScore > 0.3) return 'medium';
    return 'low';
  }
}