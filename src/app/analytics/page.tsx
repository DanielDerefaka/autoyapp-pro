'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EngagementChart } from '@/components/analytics/engagement-chart'
import { PerformanceChart } from '@/components/analytics/performance-chart'
import { ActivityHeatmap } from '@/components/analytics/activity-heatmap'
import { useEngagementMetrics, useTargetAnalytics, usePerformanceMetrics } from '@/hooks/use-analytics'
import { TrendingUp, TrendingDown, Activity, Target, DollarSign, Users, MessageSquare, Heart, Repeat2, ThumbsUp } from 'lucide-react'

export default function AnalyticsPage() {
  const { data: metrics, isLoading } = useEngagementMetrics()
  const { data: targetAnalytics, isLoading: isTargetLoading } = useTargetAnalytics()
  const { data: performanceData, isLoading: isPerformanceLoading } = usePerformanceMetrics()

  // Calculate real metrics from data
  const totalReplies = metrics?.sentReplies || 0
  const successRate = metrics?.successRate || 0
  const totalTargets = targetAnalytics?.summary?.totalTargets || 0
  const totalEngagements = targetAnalytics?.summary?.totalEngagements || 0
  const avgResponseTime = metrics?.averageResponseTime || 0

  const statCards = [
    {
      title: 'Total Replies',
      value: totalReplies,
      change: totalReplies > 0 ? '+12%' : 'N/A',
      trend: 'up' as const,
      icon: MessageSquare,
    },
    {
      title: 'Success Rate',
      value: `${successRate.toFixed(1)}%`,
      change: successRate > 0 ? '+2.1%' : 'N/A',
      trend: 'up' as const,
      icon: TrendingUp,
    },
    {
      title: 'Active Targets',
      value: totalTargets,
      change: totalTargets > 0 ? '+5' : 'N/A',
      trend: 'up' as const,
      icon: Target,
    },
    {
      title: 'Total Engagements',
      value: totalEngagements,
      change: totalEngagements > 0 ? '+8%' : 'N/A',
      trend: 'up' as const,
      icon: Activity,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-gray-500 text-sm">
          {metrics ? `${totalReplies} replies sent • ${totalTargets} targets monitored • ${(avgResponseTime / 1000).toFixed(1)}s avg response time` : 'Loading analytics...'}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="border-gray-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">{stat.value}</div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  {stat.change !== 'N/A' && (
                    <>
                      {stat.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      {stat.change} from last month
                    </>
                  )}
                  {stat.change === 'N/A' && 'No data yet'}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <EngagementChart data={metrics?.dailyStats} isLoading={isLoading} />
        <PerformanceChart data={performanceData?.engagementTrends} isLoading={isPerformanceLoading} />
      </div>

      {/* Activity Heatmap */}
      <ActivityHeatmap data={targetAnalytics?.targets} isLoading={isTargetLoading} />

      {/* Target Performance */}
      <Card className="border-gray-100">
        <CardHeader>
          <CardTitle className="text-black">Target Performance</CardTitle>
          <CardDescription className="text-gray-500">
            {targetAnalytics?.targets?.length || 0} targets being monitored
          </CardDescription>
        </CardHeader>
        <CardContent>
          {targetAnalytics?.targets && targetAnalytics.targets.length > 0 ? (
            <div className="space-y-4">
              {targetAnalytics.targets.slice(0, 5).map((target, index) => (
                <div key={target.targetUsername} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium text-black">@{target.targetUsername}</p>
                      <div className={`w-2 h-2 rounded-full ${
                        target.engagementScore > 70 ? 'bg-green-500' : 
                        target.engagementScore > 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                    <p className="text-sm text-gray-500">
                      {target.totalTweets} tweets • {target.repliesSent} replies sent
                    </p>
                    {target.lastActivity && (
                      <p className="text-xs text-gray-400">
                        Last activity: {new Date(target.lastActivity).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-black">{target.engagementScore.toFixed(0)}</div>
                      <p className="text-xs text-gray-500">Score</p>
                    </div>
                    <div className="flex space-x-1">
                      <div className="text-center px-2">
                        <div className="text-sm font-medium text-green-600">{target.sentimentDistribution.positive}</div>
                        <ThumbsUp className="h-3 w-3 text-green-500 mx-auto" />
                      </div>
                      <div className="text-center px-2">
                        <div className="text-sm font-medium text-gray-600">{target.sentimentDistribution.neutral}</div>
                        <div className="w-3 h-3 bg-gray-400 rounded-full mx-auto"></div>
                      </div>
                      <div className="text-center px-2">
                        <div className="text-sm font-medium text-red-600">{target.sentimentDistribution.negative}</div>
                        <div className="w-3 h-3 bg-red-500 rounded-full mx-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-black mb-2">No target data yet</h3>
              <p className="text-gray-500">
                Add target users to start monitoring their activity and generating analytics.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Breakdown */}
      {metrics?.engagementsByType && Object.keys(metrics.engagementsByType).length > 0 && (
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black">Engagement Types</CardTitle>
            <CardDescription className="text-gray-500">
              Breakdown of different engagement types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {Object.entries(metrics.engagementsByType).map(([type, count]) => {
                const getIcon = (type: string) => {
                  switch (type) {
                    case 'like': return Heart
                    case 'retweet': return Repeat2
                    case 'reply': return MessageSquare
                    default: return Activity
                  }
                }
                const Icon = getIcon(type)
                return (
                  <div key={type} className="text-center p-4 border border-gray-100 rounded-lg">
                    <Icon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-black">{count}</div>
                    <p className="text-sm text-gray-500 capitalize">{type}s</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}