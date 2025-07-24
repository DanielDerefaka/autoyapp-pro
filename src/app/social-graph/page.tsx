'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Network, 
  Users, 
  TrendingUp, 
  Target, 
  Brain,
  Zap,
  Globe,
  ArrowRight,
  RefreshCw,
  Eye,
  MessageCircle,
  Heart,
  Repeat2,
  UserCheck,
  Activity
} from 'lucide-react';
import { 
  useSocialGraphSummary, 
  useEngagementOpportunities, 
  useInfluenceRankings,
  useCommunityDetection,
  useNetworkMetrics,
  useAnalyzeSocialGraph,
  useSeedSocialGraph
} from '@/hooks/use-social-graph';
import { formatDistanceToNow } from 'date-fns';

export default function SocialGraphPage() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useSocialGraphSummary();
  const { data: opportunities, isLoading: opportunitiesLoading } = useEngagementOpportunities({ limit: 10 });
  const { data: influenceRankings, isLoading: influenceLoading } = useInfluenceRankings();
  const { data: communities, isLoading: communitiesLoading } = useCommunityDetection();
  const { data: metrics, isLoading: metricsLoading } = useNetworkMetrics();
  const analyzeGraphMutation = useAnalyzeSocialGraph();
  const seedGraphMutation = useSeedSocialGraph();

  const getOpportunityIcon = (type: string) => {
    switch (type) {
      case 'direct_reply': return <MessageCircle className="h-4 w-4" />;
      case 'bridge_connection': return <Network className="h-4 w-4" />;
      case 'community_entry': return <Users className="h-4 w-4" />;
      case 'influence_path': return <TrendingUp className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getOpportunityColor = (type: string) => {
    switch (type) {
      case 'direct_reply': return 'default';
      case 'bridge_connection': return 'secondary';
      case 'community_entry': return 'outline';
      case 'influence_path': return 'destructive';
      default: return 'default';
    }
  };

  const handleAnalyzeGraph = async () => {
    await analyzeGraphMutation.mutateAsync({
      analysisType: 'full',
      maxDepth: 2,
      includeMetrics: true,
    });
  };

  const handleSeedGraph = async () => {
    await seedGraphMutation.mutateAsync();
  };

  // Check if we have no data and show setup UI
  const hasNoData = summary?.status !== 'available' && !summaryLoading;
  const networkSize = summary?.networkSize || 0;

  if (summaryLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show setup/empty state if no data
  if (hasNoData || networkSize === 0) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Social Graph Analysis</h2>
            <p className="text-muted-foreground">Analyze relationships and find engagement opportunities</p>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-muted/30 rounded-full mb-6">
            <Network className="h-12 w-12 text-muted-foreground" />
          </div>
          
          <h3 className="text-xl font-semibold mb-2">No Social Graph Data</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Your social graph is empty. Get started by seeding it with your target users to build relationships and find engagement opportunities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={handleSeedGraph}
              disabled={seedGraphMutation.isPending}
              className="gap-2"
              size="lg"
            >
              <Brain className="h-4 w-4" />
              {seedGraphMutation.isPending ? 'Seeding Graph...' : 'Seed Social Graph'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/target-users'}
              size="lg"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Target Users
            </Button>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 max-w-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How it works:</h4>
            <ol className="text-sm text-blue-700 dark:text-blue-300 text-left space-y-1">
              <li>1. Add target users you want to engage with</li>
              <li>2. Seed the social graph to create relationships</li>
              <li>3. Run analysis to find engagement opportunities</li>
              <li>4. Use insights to improve your replies and networking</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Social Graph Analysis</h2>
          <p className="text-muted-foreground">Analyze relationships and find engagement opportunities</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => refetchSummary()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button 
            onClick={handleSeedGraph}
            disabled={seedGraphMutation.isPending}
            variant="outline"
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            {seedGraphMutation.isPending ? 'Seeding...' : 'Seed More Data'}
          </Button>
          <Button 
            onClick={handleAnalyzeGraph} 
            disabled={analyzeGraphMutation.isPending}
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            {analyzeGraphMutation.isPending ? 'Analyzing...' : 'Analyze Graph'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Size</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.networkSize || 0}</div>
            <p className="text-xs text-muted-foreground">
              Connected users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relationships</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.relationCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Communities</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.communityCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Detected clusters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary?.status === 'available' ? 'Active' : 'No Data'}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.lastUpdated ? formatDistanceToNow(new Date(summary.lastUpdated), { addSuffix: true }) : 'Never'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="influence">Influence</TabsTrigger>
          <TabsTrigger value="communities">Communities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Network Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Network Metrics</CardTitle>
              <CardDescription>Key statistics about your social network</CardDescription>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ) : metrics ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{metrics.density.toFixed(3)}</div>
                    <div className="text-sm text-muted-foreground">Network Density</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{metrics.averageDegree.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Avg Connections</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{metrics.diameter}</div>
                    <div className="text-sm text-muted-foreground">Network Diameter</div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No network metrics available. Run an analysis to generate metrics.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Most Influential User */}
          {metrics?.mostInfluential?.username && (
            <Card>
              <CardHeader>
                <CardTitle>Most Influential User</CardTitle>
                <CardDescription>The user with the highest influence score in your network</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <UserCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">@{metrics.mostInfluential.username}</div>
                    <div className="text-sm text-muted-foreground">
                      Influence Score: {metrics.mostInfluential.score.toFixed(3)}
                    </div>
                  </div>
                  <Badge variant="secondary">Top Influencer</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Opportunities</CardTitle>
              <CardDescription>
                Strategic engagement recommendations based on social graph analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {opportunitiesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse border rounded-lg p-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : opportunities?.data?.length ? (
                <div className="space-y-4">
                  {opportunities.data.map((opportunity: any) => (
                    <div key={opportunity.targetNodeId} className="border rounded-lg p-4 hover:border-primary transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {getOpportunityIcon(opportunity.opportunityType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-medium">@{opportunity.targetUsername}</span>
                              <Badge variant={getOpportunityColor(opportunity.opportunityType) as any}>
                                {opportunity.opportunityType.replace('_', ' ')}
                              </Badge>
                              <div className="text-sm text-muted-foreground">
                                Potential Reach: {opportunity.potentialReach.toLocaleString()}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {opportunity.description}
                            </p>
                            {opportunity.context.recentTopics?.length > 0 && (
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-muted-foreground">Topics:</span>
                                <div className="flex space-x-1">
                                  {opportunity.context.recentTopics.slice(0, 3).map((topic: string) => (
                                    <Badge key={topic} variant="outline" className="text-xs">
                                      {topic}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {Math.round(opportunity.confidenceScore * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Confidence</div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No engagement opportunities found. Build your social graph by adding target users and analyzing interactions.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="influence" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Influence Rankings</CardTitle>
              <CardDescription>Users ranked by their influence in your network</CardDescription>
            </CardHeader>
            <CardContent>
              {influenceLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse flex items-center space-x-4 p-3 border rounded-lg">
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : influenceRankings?.length ? (
                <div className="space-y-3">
                  {influenceRankings.slice(0, 10).map((ranking: any) => (
                    <div key={ranking.nodeId} className="flex items-center space-x-4 p-3 border rounded-lg hover:border-primary transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-semibold text-primary">
                        {ranking.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">@{ranking.username}</div>
                        <div className="text-sm text-muted-foreground">
                          Influence Score: {ranking.score.toFixed(3)}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${Math.min(ranking.score * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No influence rankings available. Run a social graph analysis to generate influence scores.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Community Detection</CardTitle>
              <CardDescription>Identified communities and clusters in your network</CardDescription>
            </CardHeader>
            <CardContent>
              {communitiesLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="animate-pulse border rounded-lg p-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : communities?.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {communities.map((community: any) => (
                    <div key={community.clusterId} className="border rounded-lg p-4 hover:border-primary transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold">{community.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {community.nodes.length} members • Density: {(community.density * 100).toFixed(1)}%
                          </p>
                        </div>
                        <Badge variant="outline">{community.clusterId}</Badge>
                      </div>
                      
                      {community.topics?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground mb-1">Topics:</p>
                          <div className="flex flex-wrap gap-1">
                            {community.topics.slice(0, 4).map((topic: string) => (
                              <Badge key={topic} variant="secondary" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {community.centralNode && (
                        <div className="text-xs text-muted-foreground">
                          Central node: @{community.centralNode}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No communities detected. Ensure you have sufficient network data and run a full analysis.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}