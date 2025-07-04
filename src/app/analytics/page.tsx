'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EngagementChart } from '@/components/analytics/engagement-chart'
import { PerformanceChart } from '@/components/analytics/performance-chart'
import { ActivityHeatmap } from '@/components/analytics/activity-heatmap'
import { useEngagementMetrics, useTargetAnalytics, usePerformanceMetrics } from '@/hooks/use-analytics'
import { TrendingUp, TrendingDown, Activity, Target, DollarSign, Users, MessageSquare, Heart, Repeat2, ThumbsUp, BarChart3, Download, Filter, Sparkles, Eye, Clock } from 'lucide-react'

export default function AnalyticsPage() {
  const { data: metrics, isLoading, error } = useEngagementMetrics()
  const { data: targetAnalytics, isLoading: isTargetLoading, error: targetError } = useTargetAnalytics()
  const { data: performanceData, isLoading: isPerformanceLoading, error: performanceError } = usePerformanceMetrics()

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
      color: 'blue'
    },
    {
      title: 'Success Rate',
      value: `${successRate.toFixed(1)}%`,
      change: successRate > 0 ? '+2.1%' : 'N/A',
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Active Targets',
      value: totalTargets,
      change: totalTargets > 0 ? '+5' : 'N/A',
      trend: 'up' as const,
      icon: Target,
      color: 'purple'
    },
    {
      title: 'Total Engagements',
      value: totalEngagements,
      change: totalEngagements > 0 ? '+8%' : 'N/A',
      trend: 'up' as const,
      icon: Activity,
      color: 'orange'
    },
  ]

  if (error || targetError || performanceError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="glass rounded-2xl p-8 border border-white/20 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics Error</h3>
            <p className="text-gray-500 mb-4">
              There was an error loading your analytics data. Please try refreshing the page.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full px-6"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="glass rounded-2xl p-6 mb-8 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl mr-3">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
                Analytics Dashboard
              </h1>
              <p className="text-gray-600">
                {metrics ? 
                  `${totalReplies} replies sent • ${totalTargets} targets monitored • ${(avgResponseTime / 1000).toFixed(1)}s avg response time` : 
                  'Loading analytics...'
                }
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" className="glass border-white/20 hover:bg-blue-50/50 rounded-full">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full px-6">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon
            const colorClasses = {
              blue: 'from-blue-500 to-cyan-500',
              green: 'from-green-500 to-emerald-500',
              purple: 'from-purple-500 to-pink-500',
              orange: 'from-orange-500 to-red-500'
            }
            
            return (
              <div key={stat.title} className="glass rounded-2xl p-6 border border-white/20 hover:border-blue-200/50 transition-all duration-200 hover:shadow-lg group">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 bg-gradient-to-br ${colorClasses[stat.color as keyof typeof colorClasses]} rounded-xl`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  {stat.change !== 'N/A' && (
                    <div className="flex items-center space-x-1">
                      {stat.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium text-emerald-500">{stat.change}</span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  {stat.change === 'N/A' ? (
                    <p className="text-xs text-gray-500 mt-1">No data yet</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">vs last month</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <div className="glass rounded-2xl border border-white/20 overflow-hidden">
            <EngagementChart data={metrics?.dailyStats} isLoading={isLoading} />
          </div>
          <div className="glass rounded-2xl border border-white/20 overflow-hidden">
            <PerformanceChart data={performanceData?.engagementTrends} isLoading={isPerformanceLoading} />
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="glass rounded-2xl mb-8 border border-white/20 overflow-hidden">
          <ActivityHeatmap data={targetAnalytics?.targets} isLoading={isTargetLoading} />
        </div>

        {/* Target Performance */}
        <div className="glass rounded-2xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Target className="h-5 w-5 mr-2 text-blue-600" />
                  Target Performance
                </h3>
                <p className="text-gray-600 mt-1">
                  {targetAnalytics?.targets?.length || 0} targets being monitored
                </p>
              </div>
              <Badge variant="secondary" className="bg-blue-100/50 text-blue-700 border-blue-200/50">
                Live Data
              </Badge>
            </div>
          </div>
          
          <div className="p-6">
            {targetAnalytics?.targets && targetAnalytics.targets.length > 0 ? (
              <div className="space-y-4">
                {targetAnalytics.targets.slice(0, 5).map((target, index) => (
                  <div key={target.targetUsername} className="bg-white/50 rounded-xl p-4 border border-white/20 hover:bg-white/70 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {target.targetUsername.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">@{target.targetUsername}</p>
                            <div className={`w-2 h-2 rounded-full inline-block ${
                              target.engagementScore > 70 ? 'bg-green-500' : 
                              target.engagementScore > 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span>{target.totalTweets} tweets</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="h-4 w-4" />
                            <span>{target.repliesSent} replies</span>
                          </div>
                          {target.lastActivity && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>Last: {new Date(target.lastActivity).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{target.engagementScore.toFixed(0)}</div>
                          <p className="text-xs text-gray-500">Score</p>
                        </div>
                        <div className="flex space-x-2">
                          <div className="text-center px-2">
                            <div className="text-sm font-medium text-green-600">{target.sentimentDistribution.positive.toFixed(0)}%</div>
                            <ThumbsUp className="h-3 w-3 text-green-500 mx-auto" />
                          </div>
                          <div className="text-center px-2">
                            <div className="text-sm font-medium text-gray-600">{target.sentimentDistribution.neutral.toFixed(0)}%</div>
                            <div className="w-3 h-3 bg-gray-400 rounded-full mx-auto"></div>
                          </div>
                          <div className="text-center px-2">
                            <div className="text-sm font-medium text-red-600">{target.sentimentDistribution.negative.toFixed(0)}%</div>
                            <div className="w-3 h-3 bg-red-500 rounded-full mx-auto"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No target data yet</h3>
                <p className="text-gray-500 mb-6">
                  Add target users to start monitoring their activity and generating analytics.
                </p>
                <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full px-6">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Add Targets
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Engagement Breakdown */}
        {metrics?.engagementsByType && Object.keys(metrics.engagementsByType).length > 0 && (
          <div className="glass rounded-2xl mt-8 border border-white/20 overflow-hidden">
            <div className="p-6 border-b border-white/20">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600" />
                Engagement Breakdown
              </h3>
              <p className="text-gray-600 mt-1">
                Different types of engagement activities
              </p>
            </div>
            <div className="p-6">
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
                    <div key={type} className="text-center p-4 bg-white/50 rounded-xl border border-white/20 hover:bg-white/70 transition-all">
                      <Icon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                      <p className="text-sm text-gray-600 capitalize">{type}s</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}