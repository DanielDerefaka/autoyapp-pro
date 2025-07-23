'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { performanceMonitor } from '@/lib/performance-monitor'
import { Activity, Zap, Smartphone, Wifi, Clock, AlertCircle, CheckCircle, Download } from 'lucide-react'

export function PerformanceDashboard() {
  const [summary, setSummary] = useState<any>(null)
  const [metrics, setMetrics] = useState<any[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updateData = () => {
      setSummary(performanceMonitor.getPerformanceSummary())
      setMetrics(performanceMonitor.getMetrics().slice(-20)) // Last 20 metrics
    }

    updateData()
    const interval = setInterval(updateData, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const getPerformanceStatus = (avgTime: number) => {
    if (avgTime < 1000) return { status: 'excellent', color: 'bg-green-500', icon: CheckCircle }
    if (avgTime < 2000) return { status: 'good', color: 'bg-blue-500', icon: CheckCircle }
    if (avgTime < 3000) return { status: 'fair', color: 'bg-yellow-500', icon: Clock }
    return { status: 'poor', color: 'bg-red-500', icon: AlertCircle }
  }

  const exportMetrics = () => {
    const data = performanceMonitor.exportMetrics()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!summary) return null

  const pageLoadStatus = getPerformanceStatus(summary.averagePageLoad)
  const apiRequestStatus = getPerformanceStatus(summary.averageApiRequest)

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsVisible(!isVisible)}
        size="sm"
        className={`mb-2 ${!isVisible ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300`}
        variant="outline"
      >
        <Activity className="h-4 w-4" />
      </Button>

      {/* Dashboard */}
      <Card className="w-80 max-h-96 overflow-y-auto glass border-white/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center">
                <Zap className="h-4 w-4 mr-2 text-blue-500" />
                Performance Monitor
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time app performance metrics
              </CardDescription>
            </div>
            <Button
              onClick={exportMetrics}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Device Info */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-3 w-3" />
              <span>{summary.isMobile ? 'Mobile' : 'Desktop'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wifi className="h-3 w-3" />
              <span className="capitalize">{summary.connectionType}</span>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-xs font-medium flex items-center">
                <div className={`w-2 h-2 rounded-full ${pageLoadStatus.color} mr-2`}></div>
                Page Load
              </div>
              <div className="text-lg font-bold">
                {summary.averagePageLoad > 0 ? `${summary.averagePageLoad.toFixed(0)}ms` : 'N/A'}
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {pageLoadStatus.status}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium flex items-center">
                <div className={`w-2 h-2 rounded-full ${apiRequestStatus.color} mr-2`}></div>
                API Requests
              </div>
              <div className="text-lg font-bold">
                {summary.averageApiRequest > 0 ? `${summary.averageApiRequest.toFixed(0)}ms` : 'N/A'}
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {apiRequestStatus.status}
              </div>
            </div>
          </div>

          {/* Request Distribution */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Recent Requests</div>
            <div className="flex justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Fast (&lt;1s): {summary.fastRequests?.length || 0}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>Slow (&gt;3s): {summary.slowRequests?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Recent Metrics */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Recent Activity</div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {metrics.slice(-5).map((metric, index) => (
                <div key={index} className="flex justify-between items-center text-xs p-2 rounded bg-gray-50 dark:bg-gray-800">
                  <div className="truncate flex-1">
                    <span className="font-mono">{metric.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={metric.duration < 1000 ? 'default' : metric.duration < 3000 ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {metric.duration.toFixed(0)}ms
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Recommendations */}
          {(summary.slowRequests?.length > 0 || summary.averageApiRequest > 3000) && (
            <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center space-x-2 text-xs text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="h-3 w-3" />
                <span className="font-medium">Performance Tips</span>
              </div>
              <div className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                {summary.isMobile && 'Mobile detected: Consider reducing data usage.'}
                {summary.connectionType === 'slow-2g' && ' Slow connection detected.'}
                {summary.slowRequests?.length > 3 && ' Multiple slow requests detected.'}
              </div>
            </div>
          )}

          {/* Manual Actions */}
          <div className="flex space-x-2">
            <Button
              onClick={() => performanceMonitor.clearMetrics()}
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
            >
              Clear Metrics
            </Button>
            <Button
              onClick={() => setIsVisible(false)}
              size="sm"
              variant="ghost"
              className="flex-1 text-xs"
            >
              Hide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for easy integration
export function usePerformanceDashboard() {
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    // Enable in development or when explicitly requested
    const shouldEnable = 
      process.env.NODE_ENV === 'development' || 
      localStorage.getItem('performance-monitor') === 'true'
    
    setIsEnabled(shouldEnable)
  }, [])

  return {
    isEnabled,
    PerformanceDashboard: isEnabled ? PerformanceDashboard : () => null,
    enableMonitoring: () => {
      localStorage.setItem('performance-monitor', 'true')
      setIsEnabled(true)
    },
    disableMonitoring: () => {
      localStorage.removeItem('performance-monitor')
      setIsEnabled(false)
    }
  }
}