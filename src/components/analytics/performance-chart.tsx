'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format, subDays } from 'date-fns'

interface EngagementTrend {
  date: string
  engagements: number
  replies: number
  rate: number
}

interface PerformanceChartProps {
  data?: EngagementTrend[]
  isLoading?: boolean
}

// Fallback empty data when no real data is available
const generateEmptyData = (): EngagementTrend[] => {
  const data: EngagementTrend[] = []
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i)
    data.push({
      date: date.toISOString(),
      engagements: 0,
      replies: 0,
      rate: 0,
    })
  }
  return data
}

export function PerformanceChart({ data, isLoading = false }: PerformanceChartProps) {
  // Format data for chart display
  const chartData = data && data.length > 0 ? 
    data.map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      engagements: item.engagements,
      replies: item.replies,
      rate: item.rate
    })) : 
    generateEmptyData().map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      engagements: item.engagements,
      replies: item.replies,
      rate: item.rate
    }))

  if (isLoading) {
    return (
      <Card className="border-gray-100">
        <CardHeader>
          <CardTitle className="text-black">Performance Trends</CardTitle>
          <CardDescription className="text-gray-500">Daily engagement and reply trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardTitle className="text-black">Performance Trends</CardTitle>
        <CardDescription className="text-gray-500">
          {data && data.length > 0 ? 
            `Daily engagement and reply trends for the last ${data.length} days` : 
            'No performance data available yet'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                labelStyle={{ color: '#1f2937' }}
              />
              <Bar 
                dataKey="replies" 
                fill="#000000" 
                name="Replies"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="engagements" 
                fill="#6b7280" 
                name="Engagements"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          {(!data || data.length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-400 mb-2">📊</div>
                <p className="text-sm text-gray-500">Start sending replies to see performance trends</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}