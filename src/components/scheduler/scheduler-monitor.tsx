'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Play, Square, RotateCcw, AlertCircle, CheckCircle, Activity, Zap, Settings } from 'lucide-react'

interface SchedulerStatus {
  isRunning: boolean
  options: {
    intervalMinutes: number
    retryAttempts: number
    retryDelayMs: number
  }
  baseUrl: string
  environment: {
    nodeEnv: string
    vercelUrl?: string
    appUrl?: string
    cronSecret: string
  }
}

interface SchedulerData {
  enhancedScheduler: {
    status: SchedulerStatus
    isRunning: boolean
  }
  legacyScheduler: {
    isRunning: boolean
  }
  timestamp: string
}

export function SchedulerMonitor() {
  const [schedulerData, setSchedulerData] = useState<SchedulerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastTrigger, setLastTrigger] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)

  const fetchSchedulerStatus = async () => {
    try {
      const response = await fetch('/api/test/scheduler?action=status')
      const data = await response.json()
      setSchedulerData(data)
    } catch (error) {
      console.error('Failed to fetch scheduler status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSchedulerAction = async (action: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/test/scheduler?action=${action}`)
      const result = await response.json()
      
      if (action.startsWith('trigger')) {
        setLastTrigger(result)
      }
      
      await fetchSchedulerStatus() // Refresh status
    } catch (error) {
      console.error(`Failed to ${action} scheduler:`, error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedulerStatus()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSchedulerStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !schedulerData) {
    return (
      <div className="fixed bottom-20 right-4 z-40">
        <Card className="w-80 glass border-white/20">
          <CardContent className="p-6">
            <div className="animate-pulse flex items-center space-x-3">
              <Activity className="h-5 w-5" />
              <span>Loading scheduler status...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const enhanced = schedulerData?.enhancedScheduler
  const legacy = schedulerData?.legacyScheduler

  return (
    <div className={`fixed bottom-20 right-4 z-40 transition-all duration-300 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsVisible(!isVisible)}
        size="sm"
        className={`mb-2 ${!isVisible ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300`}
        variant="outline"
      >
        <Clock className="h-4 w-4" />
      </Button>

      {/* Monitor Dashboard */}
      <Card className="w-96 max-h-[500px] overflow-y-auto glass border-white/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center">
                <Activity className="h-4 w-4 mr-2 text-blue-500" />
                Scheduler Monitor
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time scheduler status and controls
              </CardDescription>
            </div>
            <Button
              onClick={fetchSchedulerStatus}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={loading}
            >
              <RotateCcw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Enhanced Scheduler Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Enhanced Scheduler</span>
              <Badge variant={enhanced?.isRunning ? 'default' : 'secondary'}>
                {enhanced?.isRunning ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Running</>
                ) : (
                  <><AlertCircle className="h-3 w-3 mr-1" /> Stopped</>
                )}
              </Badge>
            </div>
            
            {enhanced?.status && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <div className="text-gray-500">Interval</div>
                  <div className="font-mono">{enhanced.status.options.intervalMinutes}m</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Retries</div>
                  <div className="font-mono">{enhanced.status.options.retryAttempts}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Environment</div>
                  <div className="font-mono">{enhanced.status.environment.nodeEnv}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500">Auth</div>
                  <div className="font-mono">{enhanced.status.environment.cronSecret}</div>
                </div>
              </div>
            )}
          </div>

          {/* Legacy Scheduler Status */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Legacy Scheduler</span>
              <Badge variant={legacy?.isRunning ? 'default' : 'secondary'} className="text-xs">
                {legacy?.isRunning ? 'Running' : 'Stopped'}
              </Badge>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium">Controls</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleSchedulerAction(enhanced?.isRunning ? 'stop' : 'start')}
                size="sm"
                variant={enhanced?.isRunning ? 'destructive' : 'default'}
                disabled={loading}
                className="text-xs"
              >
                {enhanced?.isRunning ? (
                  <><Square className="h-3 w-3 mr-1" /> Stop</>
                ) : (
                  <><Play className="h-3 w-3 mr-1" /> Start</>
                )}
              </Button>
              
              <Button
                onClick={() => handleSchedulerAction('trigger-all')}
                size="sm"
                variant="outline"
                disabled={loading}
                className="text-xs"
              >
                <Zap className="h-3 w-3 mr-1" /> Trigger
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleSchedulerAction('trigger-tweets')}
                size="sm"
                variant="outline"
                disabled={loading}
                className="text-xs"
              >
                📝 Tweets
              </Button>
              
              <Button
                onClick={() => handleSchedulerAction('trigger-replies')}
                size="sm"
                variant="outline"
                disabled={loading}
                className="text-xs"
              >
                💬 Replies
              </Button>
            </div>
          </div>

          {/* Last Trigger Result */}
          {lastTrigger && (
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium">Last Trigger Result</div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 space-y-1">
                {lastTrigger.results?.tweets && (
                  <div className="text-xs">
                    <span className="font-mono">Tweets:</span> {lastTrigger.results.tweets.processed || 0} processed
                  </div>
                )}
                {lastTrigger.results?.replies && (
                  <div className="text-xs">
                    <span className="font-mono">Replies:</span> {lastTrigger.results.replies.processed || 0} processed
                  </div>
                )}
                {lastTrigger.results?.replies?.queueStats && (
                  <div className="text-xs">
                    <span className="font-mono">Queue:</span> {Object.entries(lastTrigger.results.replies.queueStats).map(([status, count]) => `${status}: ${count}`).join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Environment Info */}
          {enhanced?.status && (
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium">Environment</div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 space-y-1 text-xs">
                <div><span className="font-mono">Base URL:</span> {enhanced.status.baseUrl}</div>
                {enhanced.status.environment.vercelUrl && (
                  <div><span className="font-mono">Vercel:</span> {enhanced.status.environment.vercelUrl}</div>
                )}
                <div><span className="font-mono">Updated:</span> {new Date(schedulerData?.timestamp || '').toLocaleTimeString()}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-2">
            <Button
              onClick={() => setIsVisible(false)}
              size="sm"
              variant="ghost"
              className="flex-1 text-xs"
            >
              Hide
            </Button>
            <Button
              onClick={() => window.open('/api/test/scheduler?action=status', '_blank')}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for easy integration
export function useSchedulerMonitor() {
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    // Enable in development or when explicitly requested
    const shouldEnable = 
      process.env.NODE_ENV === 'development' || 
      localStorage.getItem('scheduler-monitor') === 'true'
    
    setIsEnabled(shouldEnable)
  }, [])

  return {
    isEnabled,
    SchedulerMonitor: isEnabled ? SchedulerMonitor : () => null,
    enableMonitoring: () => {
      localStorage.setItem('scheduler-monitor', 'true')
      setIsEnabled(true)
    },
    disableMonitoring: () => {
      localStorage.removeItem('scheduler-monitor')
      setIsEnabled(false)
    }
  }
}