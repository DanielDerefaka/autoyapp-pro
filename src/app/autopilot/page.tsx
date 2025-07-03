'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bot, 
  Play, 
  Pause, 
  Settings, 
  Activity, 
  Clock, 
  Users, 
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'

interface AutopilotStatus {
  isEnabled: boolean
  isActive: boolean
  lastRun: string | null
  nextRun: string | null
  todayStats: {
    repliesSent: number
    maxReplies: number
    targetsMonitored: number
    tweetsProcessed: number
  }
  recentActivity: Array<{
    id: string
    action: string
    timestamp: string
    details: string
    status: 'success' | 'warning' | 'error'
  }>
  queueStats: {
    pending: number
    scheduled: number
    failed: number
  }
}

export default function AutopilotPage() {
  const [status, setStatus] = useState<AutopilotStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAutopilotStatus()
    // Refresh status every 30 seconds
    const interval = setInterval(fetchAutopilotStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAutopilotStatus = async () => {
    try {
      // This would be a real API call to get autopilot status
      // For now, using mock data
      const mockStatus: AutopilotStatus = {
        isEnabled: true,
        isActive: true,
        lastRun: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        nextRun: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        todayStats: {
          repliesSent: 12,
          maxReplies: 30,
          targetsMonitored: 8,
          tweetsProcessed: 45
        },
        recentActivity: [
          {
            id: '1',
            action: 'Reply sent',
            timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
            details: 'Replied to @johndoe tweet about AI trends',
            status: 'success'
          },
          {
            id: '2',
            action: 'Tweet analyzed',
            timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
            details: 'Analyzed 3 new tweets from target users',
            status: 'success'
          },
          {
            id: '3',
            action: 'Rate limit warning',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            details: 'Approaching hourly rate limit (4/5 replies)',
            status: 'warning'
          }
        ],
        queueStats: {
          pending: 3,
          scheduled: 7,
          failed: 1
        }
      }
      
      setStatus(mockStatus)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching autopilot status:', error)
      setLoading(false)
    }
  }

  const toggleAutopilot = async () => {
    // This would toggle autopilot via API
    if (status) {
      setStatus(prev => prev ? { ...prev, isEnabled: !prev.isEnabled } : null)
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const formatNextRun = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Starting soon'
    if (diffMins < 60) return `in ${diffMins}m`
    const diffHours = Math.floor(diffMins / 60)
    return `in ${diffHours}h ${diffMins % 60}m`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-1/4 mb-4"></div>
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="text-center py-12">
        <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-black mb-2">Unable to load autopilot status</h3>
        <Button onClick={fetchAutopilotStatus} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-black flex items-center">
            <Bot className="h-7 w-7 mr-2" />
            Autopilot Dashboard
          </h1>
          <p className="text-gray-500">
            Monitor your AI-powered engagement automation
          </p>
        </div>
        <div className="flex space-x-3">
          <Link href="/settings/autopilot">
            <Button variant="outline" className="border-gray-200 text-black hover:bg-gray-50">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          <Button 
            onClick={toggleAutopilot}
            className={status.isEnabled 
              ? "bg-red-600 text-white hover:bg-red-700" 
              : "bg-green-600 text-white hover:bg-green-700"
            }
          >
            {status.isEnabled ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause Autopilot
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Autopilot
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      <Alert className={status.isEnabled ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
        <Activity className={`h-4 w-4 ${status.isEnabled ? "text-green-600" : "text-red-600"}`} />
        <AlertDescription className={status.isEnabled ? "text-green-800" : "text-red-800"}>
          {status.isEnabled 
            ? `🤖 Autopilot is ACTIVE - Last run: ${status.lastRun ? formatRelativeTime(status.lastRun) : 'Never'} | Next run: ${status.nextRun ? formatNextRun(status.nextRun) : 'Soon'}`
            : "⏸️ Autopilot is PAUSED - No automatic replies will be sent"
          }
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {/* Today's Stats */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Today's Performance
            </CardTitle>
            <CardDescription>
              Your autopilot activity for {new Date().toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-black">
                  {status.todayStats.repliesSent}
                  <span className="text-sm text-gray-500">/{status.todayStats.maxReplies}</span>
                </div>
                <p className="text-sm text-gray-500">Replies Sent</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(status.todayStats.repliesSent / status.todayStats.maxReplies) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-black">{status.todayStats.targetsMonitored}</div>
                <p className="text-sm text-gray-500">Targets Monitored</p>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-black">{status.todayStats.tweetsProcessed}</div>
                <p className="text-sm text-gray-500">Tweets Analyzed</p>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((status.todayStats.repliesSent / status.todayStats.tweetsProcessed) * 100) || 0}%
                </div>
                <p className="text-sm text-gray-500">Reply Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue Status */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Reply Queue
            </CardTitle>
            <CardDescription>
              Current status of scheduled replies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{status.queueStats.pending}</div>
                <p className="text-sm text-gray-500">Pending</p>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{status.queueStats.scheduled}</div>
                <p className="text-sm text-gray-500">Scheduled</p>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{status.queueStats.failed}</div>
                <p className="text-sm text-gray-500">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest autopilot actions and events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {status.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100">
                  <div className="flex-shrink-0">
                    {activity.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {activity.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                    {activity.status === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-black">{activity.action}</p>
                      <span className="text-sm text-gray-500">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{activity.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}