'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQueueStatus, useManageQueue } from '@/hooks/use-queue'
import { Clock, Play, Pause, Trash, RefreshCw, MessageSquare, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-gray-500 text-sm">
            Queue Status • Last updated {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={isProcessing}
            className="border-gray-200 text-black hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleQueueAction('pause')}
            disabled={isProcessing}
            className="border-gray-200 text-black hover:bg-gray-50"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause Queue
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleQueueAction('clear_failed')}
            disabled={isProcessing || (queueStatus?.userCounts.failed || 0) === 0}
            className="border-gray-200 text-black hover:bg-gray-50"
          >
            <Trash className="h-4 w-4 mr-2" />
            Clear Failed
          </Button>
        </div>
      </div>

      {/* Queue Statistics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{queueStatus?.userCounts.pending || 0}</div>
            <p className="text-xs text-gray-500">
              Waiting to be sent
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sent Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{queueStatus?.todayStats.sent || 0}</div>
            <p className="text-xs text-gray-500">
              Successfully delivered
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{queueStatus?.userCounts.failed || 0}</div>
            <p className="text-xs text-gray-500">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{queueStatus?.todayStats.total || 0}</div>
            <p className="text-xs text-gray-500">
              All activities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-gray-100">
        <CardHeader>
          <CardTitle className="text-black">Recent Activity</CardTitle>
          <CardDescription className="text-gray-500">
            Latest replies and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queueStatus?.recentActivity && queueStatus.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {queueStatus.recentActivity.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(activity.status)}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-black truncate">
                          Reply to @{activity.tweet.targetUser.targetUsername}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusBadgeColor(activity.status)}`}
                        >
                          {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 truncate mb-1">
                        "{activity.replyContent}"
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatRelativeTime(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  {activity.status === 'failed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-200 text-red-600 hover:bg-red-50"
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  )}
                  
                  {activity.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-black mb-2">No recent activity</h3>
              <p className="text-gray-500">
                Queue activities will appear here once you start adding target users and generating replies.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue Health Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black">Queue Health</CardTitle>
            <CardDescription className="text-gray-500">
              Overall status of queue processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-black">Reply Queue</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-500">Active</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-black">Rate Limiting</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-500">Healthy</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-black">Error Rate</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-500">2.3%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black">Processing Stats</CardTitle>
            <CardDescription className="text-gray-500">
              Performance metrics for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-black">Success Rate</span>
                <span className="text-sm font-medium text-black">
                  {queueStatus?.todayStats.total ? 
                    ((queueStatus.todayStats.sent / queueStatus.todayStats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-black">Avg Processing Time</span>
                <span className="text-sm font-medium text-black">1.2s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-black">Queue Backlog</span>
                <span className="text-sm font-medium text-black">{queueStatus?.userCounts.pending || 0} items</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}