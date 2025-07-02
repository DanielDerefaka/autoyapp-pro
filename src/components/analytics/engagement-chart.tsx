'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format, subDays } from 'date-fns'

interface DailyStats {
  date: string
  replies: number
  engagements: number
}

interface EngagementChartProps {
  data?: DailyStats[]
  isLoading?: boolean
}

// Fallback empty data when no real data is available
const generateEmptyData = (): DailyStats[] => {
  const data: DailyStats[] = []
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i)
    data.push({
      date: format(date, 'MMM dd'),
      replies: 0,
      engagements: 0,
    })
  }
  return data
}

export function EngagementChart({ data, isLoading = false }: EngagementChartProps) {
  // Format data for chart display
  const chartData = data && data.length > 0 ? 
    data.map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      replies: item.replies,
      engagements: item.engagements
    })) : 
    generateEmptyData()

  if (isLoading) {
    return (
      <Card className="border-gray-100">
        <CardHeader>
          <CardTitle className="text-black">Engagement Over Time</CardTitle>
          <CardDescription className="text-gray-500">Your engagement metrics for the last 7 days</CardDescription>
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
        <CardTitle className="text-black">Engagement Over Time</CardTitle>
        <CardDescription className="text-gray-500">
          {data && data.length > 0 ? 
            `Your engagement metrics for the last ${data.length} days` : 
            'No engagement data available yet'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
              <Line
                type="monotone"
                dataKey="replies"
                stroke="#000000"
                strokeWidth={2}
                dot={{ fill: '#000000', strokeWidth: 2, r: 4 }}
                name="Replies"
              />
              <Line
                type="monotone"
                dataKey="engagements"
                stroke="#6b7280"
                strokeWidth={2}
                dot={{ fill: '#6b7280', strokeWidth: 2, r: 4 }}
                name="Engagements"
              />
            </LineChart>
          </ResponsiveContainer>
          {(!data || data.length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-400 mb-2">📈</div>
                <p className="text-sm text-gray-500">Start monitoring targets to see engagement data</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}