'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/hooks/use-user'
import { useQueueStatus } from '@/hooks/use-queue'
import { useEngagementMetrics } from '@/hooks/use-analytics'
import { useTargets } from '@/hooks/use-targets'

export default function DashboardPage() {
  const { data: user, isLoading: userLoading } = useUser()
  const { data: queueStatus, isLoading: queueLoading } = useQueueStatus()
  const { data: metrics, isLoading: metricsLoading } = useEngagementMetrics()
  const { data: targets, isLoading: targetsLoading } = useTargets()

  if (userLoading || queueLoading || metricsLoading || targetsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-gray-100">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-3"></div>
                  <div className="h-8 bg-gray-100 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Replies Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{metrics?.sentReplies || 0}</div>
            <p className="text-xs text-gray-500">
              {metrics?.successRate.toFixed(1) || 0}% success rate
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Targets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{targets?.filter(t => t.isActive).length || 0}</div>
            <p className="text-xs text-gray-500">
              {targets?.length || 0} total targets
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Replies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{queueStatus?.userCounts.pending || 0}</div>
            <p className="text-xs text-gray-500">
              {queueStatus?.todayStats.sent || 0} sent today
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Queue Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-black">Active</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {queueStatus?.userCounts.pending || 0} replies queued
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black">Weekly Performance</CardTitle>
            <CardDescription className="text-gray-500">Engagement trends over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">↗ +12%</div>
                <p className="text-sm text-gray-500">Engagement increase</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black">Success Rate</CardTitle>
            <CardDescription className="text-gray-500">Reply success rate this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-black">89.2%</div>
                <p className="text-sm text-gray-500">Successful replies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-gray-100">
          <CardHeader>
            <CardTitle className="text-black">Recent Activity</CardTitle>
            <CardDescription className="text-gray-500">
              Your latest engagement activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {queueStatus?.recentActivity?.length ? (
                queueStatus.recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'sent' ? 'bg-green-500' :
                      activity.status === 'pending' ? 'bg-yellow-500' :
                      activity.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black">
                        {activity.status === 'sent' ? 'Reply sent to' : 
                         activity.status === 'pending' ? 'Reply queued for' :
                         activity.status === 'failed' ? 'Reply failed for' : 'Activity for'} @{activity.tweet.targetUser.targetUsername}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 border-gray-100">
          <CardHeader>
            <CardTitle className="text-black">Compliance Status</CardTitle>
            <CardDescription className="text-gray-500">
              Platform safety and ToS compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-black">Rate Limits</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-500">Healthy</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-black">Content Safety</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-500">Compliant</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-black">Account Status</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-500">Active</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}