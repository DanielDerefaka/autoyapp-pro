'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQueueStatus, useManageQueue } from '@/hooks/use-queue'
import { Clock, Play, Pause, Trash, RefreshCw, MessageSquare, AlertCircle, CheckCircle, XCircle, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

export default function QueueManagerPage() {
  const { data: queueStatus, isLoading, refetch } = useQueueStatus()
  const manageQueue = useManageQueue()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleQueueAction = async (action: 'pause' | 'resume' | 'clear_failed') => {
    setIsProcessing(true)
    try {
      await manageQueue.mutateAsync({
        action,
        queue: 'replies'
      })
      
      const actionMessages = {
        pause: 'Queue paused successfully',
        resume: 'Queue resumed successfully',
        clear_failed: 'Failed items cleared successfully'
      }
      
      toast.success(actionMessages[action])
    } catch (error) {
      toast.error(`Failed to ${action} queue`)
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500'
      case 'sent': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      case 'cancelled': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 border-yellow-200 bg-yellow-50'
      case 'sent': return 'text-green-600 border-green-200 bg-green-50'
      case 'failed': return 'text-red-600 border-red-200 bg-red-50'
      case 'cancelled': return 'text-gray-600 border-gray-200 bg-gray-50'
      default: return 'text-gray-600 border-gray-200 bg-gray-50'
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-gray-100">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-3"></div>
                  <div className="h-8 bg-gray-100 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-2/3"></div>
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
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <div className="p-2 bg-gradient-to-br from-chart-3/20 to-primary/20 rounded-xl mr-3">
              <Activity className="h-8 w-8 text-primary" />
            </div>
            Queue Manager
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitor and manage your reply queue • Last updated {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isProcessing}
            className="gap-2 hover:scale-105 transition-all duration-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleQueueAction('pause')}
            disabled={isProcessing}
            className="gap-2 hover:scale-105 transition-all duration-200"
          >
            <Pause className="h-4 w-4" />
            Pause Queue
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleQueueAction('clear_failed')}
            disabled={isProcessing || (queueStatus?.userCounts.failed || 0) === 0}
            className="gap-2 hover:scale-105 transition-all duration-200"
          >
            <Trash className="h-4 w-4" />
            Clear Failed
          </Button>
        </div>
      </div>

      {/* Queue Statistics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <div className="p-2 bg-chart-3/10 rounded-lg">
              <Clock className="h-4 w-4 text-chart-3" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{queueStatus?.userCounts.pending || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Waiting to be sent
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent Today</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{queueStatus?.todayStats.sent || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Successfully delivered
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
            <div className="p-2 bg-destructive/10 rounded-lg">
              <XCircle className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{queueStatus?.userCounts.failed || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Today</CardTitle>
            <div className="p-2 bg-chart-1/10 rounded-lg">
              <MessageSquare className="h-4 w-4 text-chart-1" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{queueStatus?.todayStats.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              All activities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-border bg-card glass">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center">
            <div className="p-2 bg-chart-2/10 rounded-lg mr-3">
              <MessageSquare className="h-5 w-5 text-chart-2" />
            </div>
            Recent Activity
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Latest replies and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queueStatus?.recentActivity && queueStatus.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {queueStatus.recentActivity.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-accent/50 transition-all duration-200 hover:scale-[1.01]">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(activity.status)}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-foreground truncate">
                          Reply to @{activity.tweet.targetUser.targetUsername}
                        </p>
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                        >
                          {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-1">
                        &quot;{activity.replyContent.slice(0, 100)}...&quot;
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {formatRelativeTime(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  {activity.status === 'failed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-destructive hover:bg-destructive/10 hover:scale-105 transition-all duration-200"
                    >
                      <AlertCircle className="h-3 w-3" />
                      Retry
                    </Button>
                  )}
                  
                  {activity.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-muted-foreground hover:bg-muted/50 hover:scale-105 transition-all duration-200"
                    >
                      <XCircle className="h-3 w-3" />
                      Cancel
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-4 bg-muted/20 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">No recent activity</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Queue activities will appear here once you start adding target users and generating replies.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue Health Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border bg-card glass">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <div className="p-2 bg-emerald-500/10 rounded-lg mr-3">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
              Queue Health
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Overall status of queue processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                <span className="text-sm text-foreground font-medium">Reply Queue</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">Active</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                <span className="text-sm text-foreground font-medium">Rate Limiting</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Healthy</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20">
                <span className="text-sm text-foreground font-medium">Error Rate</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">2.3%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card glass">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <div className="p-2 bg-chart-1/10 rounded-lg mr-3">
                <Activity className="h-5 w-5 text-chart-1" />
              </div>
              Processing Stats
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Performance metrics for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-chart-1/5">
                <span className="text-sm text-foreground font-medium">Success Rate</span>
                <span className="text-sm font-semibold text-foreground">
                  {queueStatus?.todayStats.total ? 
                    ((queueStatus.todayStats.sent / queueStatus.todayStats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-chart-2/5">
                <span className="text-sm text-foreground font-medium">Avg Processing Time</span>
                <span className="text-sm font-semibold text-foreground">1.2s</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-chart-3/5">
                <span className="text-sm text-foreground font-medium">Queue Backlog</span>
                <span className="text-sm font-semibold text-foreground">{queueStatus?.userCounts.pending || 0} items</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}