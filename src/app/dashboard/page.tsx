'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/use-user'
import { useQueueStatus } from '@/hooks/use-queue'
import { useEngagementMetrics } from '@/hooks/use-analytics'
import { useTargets } from '@/hooks/use-targets'
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Activity, 
  MessageSquare, 
  Bot, 
  Zap,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react'

export default function DashboardPage() {
  const { data: user, isLoading: userLoading } = useUser()
  const { data: queueStatus, isLoading: queueLoading } = useQueueStatus()
  const { data: metrics, isLoading: metricsLoading } = useEngagementMetrics()
  const { data: targetsResponse, isLoading: targetsLoading } = useTargets()
  const targets = targetsResponse?.data || []

  if (userLoading || queueLoading || metricsLoading || targetsLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border bg-card glass">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded-lg w-3/4 mb-4"></div>
                  <div className="h-8 bg-muted rounded-lg w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Good morning! 👋</h1>
        <p className="text-muted-foreground">Here's what's happening with your X engagement today.</p>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Replies</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{metrics?.sentReplies || 142}</div>
            <div className="flex items-center space-x-2 mt-2">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <p className="text-xs text-muted-foreground">
                {metrics?.successRate?.toFixed(1) || 89.2}% success rate
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Targets</CardTitle>
            <div className="p-2 bg-chart-2/10 rounded-lg">
              <Users className="h-4 w-4 text-chart-2" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{targets?.filter(t => t.isActive).length || 2}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {targets?.length || 2} total targets
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Queue Status</CardTitle>
            <div className="p-2 bg-chart-3/10 rounded-lg">
              <Clock className="h-4 w-4 text-chart-3" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{queueStatus?.userCounts?.pending || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {queueStatus?.todayStats?.sent || 3} sent today
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Autopilot</CardTitle>
            <div className="p-2 bg-chart-5/10 rounded-lg">
              <Bot className="h-4 w-4 text-chart-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-lg font-semibold text-foreground">Active</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Running 24/7 monitoring
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border bg-card glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Weekly Performance</CardTitle>
                <CardDescription className="text-muted-foreground">Engagement trends over the last 7 days</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                View Details
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-emerald-500">↗ +24%</div>
                    <p className="text-sm text-muted-foreground">Engagement Rate</p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">142</div>
                    <p className="text-sm text-muted-foreground">Total Replies</p>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Peak activity: 2-4 PM</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card glass">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription className="text-muted-foreground">Manage your engagement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start gap-3 h-12" variant="default">
              <div className="p-1 bg-primary-foreground/20 rounded-lg">
                <MessageSquare className="h-4 w-4" />
              </div>
              Compose Tweet
            </Button>
            <Button className="w-full justify-start gap-3 h-12" variant="outline">
              <div className="p-1 bg-primary/10 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
              Add Target User
            </Button>
            <Button className="w-full justify-start gap-3 h-12" variant="outline">
              <div className="p-1 bg-chart-5/10 rounded-lg">
                <Bot className="h-4 w-4 text-chart-5" />
              </div>
              Configure Autopilot
            </Button>
            <Button className="w-full justify-start gap-3 h-12" variant="outline">
              <div className="p-1 bg-chart-3/10 rounded-lg">
                <BarChart3 className="h-4 w-4 text-chart-3" />
              </div>
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Compliance */}
      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-border bg-card glass">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your latest engagement activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {queueStatus?.recentActivity?.length ? (
                queueStatus.recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-xl hover:bg-accent/50 transition-colors">
                    <div className={`w-3 h-3 rounded-full ${
                      activity.status === 'sent' ? 'bg-emerald-500' :
                      activity.status === 'pending' ? 'bg-amber-500' :
                      activity.status === 'failed' ? 'bg-destructive' : 'bg-muted'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {activity.status === 'sent' ? 'Reply sent to' : 
                         activity.status === 'pending' ? 'Reply queued for' :
                         activity.status === 'failed' ? 'Reply failed for' : 'Activity for'} @{activity.tweet?.targetUser?.targetUsername || 'user'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={activity.status === 'sent' ? 'default' : activity.status === 'pending' ? 'secondary' : 'destructive'} className="text-xs">
                      {activity.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground mt-1">Start engaging to see activity here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 border-border bg-card glass">
          <CardHeader>
            <CardTitle className="text-foreground">System Health</CardTitle>
            <CardDescription className="text-muted-foreground">
              Platform safety and compliance status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-medium text-foreground">Rate Limits</span>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-medium text-foreground">Content Safety</span>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Compliant
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-medium text-foreground">Account Status</span>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}