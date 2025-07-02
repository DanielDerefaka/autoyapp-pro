'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Target } from 'lucide-react'

interface TargetAnalytics {
  targetUsername: string
  totalTweets: number
  repliesSent: number
  engagementScore: number
  lastActivity: string | null
  sentimentDistribution: {
    positive: number
    negative: number
    neutral: number
  }
}

interface ActivityHeatmapProps {
  data?: TargetAnalytics[]
  isLoading?: boolean
}

const getEngagementLevel = (score: number): string => {
  if (score === 0) return 'bg-gray-100'
  if (score <= 25) return 'bg-red-100 border-red-200'
  if (score <= 50) return 'bg-yellow-100 border-yellow-200'
  if (score <= 75) return 'bg-blue-100 border-blue-200'
  return 'bg-green-100 border-green-200'
}

const getEngagementColor = (score: number): string => {
  if (score === 0) return 'text-gray-400'
  if (score <= 25) return 'text-red-600'
  if (score <= 50) return 'text-yellow-600'
  if (score <= 75) return 'text-blue-600'
  return 'text-green-600'
}

export function ActivityHeatmap({ data, isLoading = false }: ActivityHeatmapProps) {
  if (isLoading) {
    return (
      <Card className="border-gray-100">
        <CardHeader>
          <CardTitle className="text-black">Target Engagement Overview</CardTitle>
          <CardDescription className="text-gray-500">Engagement scores for all monitored targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[120px] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading engagement data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardTitle className="text-black">Target Engagement Overview</CardTitle>
        <CardDescription className="text-gray-500">
          {data && data.length > 0 ? 
            `Engagement scores for ${data.length} monitored targets` : 
            'No target engagement data available yet'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <div className="space-y-4">
            {/* Engagement grid */}
            <div className="grid grid-cols-6 gap-2">
              {data.slice(0, 18).map((target) => (
                <div
                  key={target.targetUsername}
                  className={cn(
                    'p-3 rounded-lg border text-center transition-colors hover:shadow-sm',
                    getEngagementLevel(target.engagementScore)
                  )}
                  title={`@${target.targetUsername}: ${target.engagementScore.toFixed(0)} engagement score, ${target.repliesSent} replies sent`}
                >
                  <div className="text-xs font-medium text-black truncate">
                    @{target.targetUsername}
                  </div>
                  <div className={cn('text-lg font-bold', getEngagementColor(target.engagementScore))}>
                    {target.engagementScore.toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {target.repliesSent} replies
                  </div>
                </div>
              ))}
            </div>
            
            {data.length > 18 && (
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  +{data.length - 18} more targets
                </p>
              </div>
            )}
            
            {/* Legend */}
            <div className="flex items-center justify-between text-xs text-gray-500 mt-6 pt-4 border-t border-gray-100">
              <span>Low Engagement</span>
              <div className="flex gap-2 items-center">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
                <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200" />
                <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200" />
                <div className="w-4 h-4 rounded bg-green-100 border border-green-200" />
              </div>
              <span>High Engagement</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-black mb-2">No engagement data yet</h3>
            <p className="text-gray-500">
              Add target users to start tracking their engagement metrics.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}