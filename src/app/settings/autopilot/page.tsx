'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { 
  Bot, 
  Save, 
  RotateCcw, 
  Zap, 
  Shield, 
  Clock, 
  Users, 
  TrendingUp,
  AlertTriangle,
  Play,
  Pause,
  Settings
} from 'lucide-react'

interface AutopilotSettings {
  isEnabled: boolean
  maxRepliesPerDay: number
  maxRepliesPerHour: number
  minDelayBetweenReplies: number
  minDelayToSameUser: number
  enabledHours: string
  enabledDays: number[]
  targetSentimentFilter: string
  onlyReplyToVerified: boolean
  skipRetweets: boolean
  skipReplies: boolean
  minFollowerCount: number
  maxTweetAge: number
  pauseIfBlocked: boolean
  pauseIfRateLimited: boolean
  notifyOnPause: boolean
  customFilters: any
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' }
]

export default function AutopilotSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AutopilotSettings>({
    isEnabled: false,
    maxRepliesPerDay: 30,
    maxRepliesPerHour: 5,
    minDelayBetweenReplies: 360,
    minDelayToSameUser: 1800,
    enabledHours: "09:00-17:00",
    enabledDays: [1, 2, 3, 4, 5],
    targetSentimentFilter: "all",
    onlyReplyToVerified: false,
    skipRetweets: true,
    skipReplies: true,
    minFollowerCount: 0,
    maxTweetAge: 1440,
    pauseIfBlocked: true,
    pauseIfRateLimited: true,
    notifyOnPause: true,
    customFilters: {}
  })

  useEffect(() => {
    fetchAutopilotSettings()
  }, [])

  const fetchAutopilotSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/autopilot/settings')
      const data = await response.json()
      
      if (response.ok) {
        setSettings(data.settings)
        if (data.tableNotExists) {
          toast.info('Using default autopilot settings (will be saved when you configure them)')
        }
      } else {
        toast.error('Failed to load autopilot settings')
      }
    } catch (error) {
      toast.error('Failed to load autopilot settings')
    } finally {
      setLoading(false)
    }
  }

  const saveAutopilotSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/autopilot/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success('Autopilot settings saved successfully!')
      } else {
        if (data.needsMigration) {
          toast.error('Database needs migration. Please contact support.')
        } else {
          toast.error(data.error || 'Failed to save autopilot settings')
        }
      }
    } catch (error) {
      toast.error('Failed to save autopilot settings')
    } finally {
      setSaving(false)
    }
  }

  const emergencyPause = async () => {
    try {
      const response = await fetch('/api/autopilot/settings', {
        method: 'DELETE'
      })

      if (response.ok) {
        setSettings(prev => ({ ...prev, isEnabled: false }))
        toast.success('Autopilot paused immediately!')
      } else {
        toast.error('Failed to pause autopilot')
      }
    } catch (error) {
      toast.error('Failed to pause autopilot')
    }
  }

  const toggleDay = (day: number) => {
    setSettings(prev => ({
      ...prev,
      enabledDays: prev.enabledDays.includes(day)
        ? prev.enabledDays.filter(d => d !== day)
        : [...prev.enabledDays, day].sort()
    }))
  }

  const formatDelay = (seconds: number) => {
    if (seconds >= 3600) {
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
    } else if (seconds >= 60) {
      return `${Math.floor(seconds / 60)}m`
    } else {
      return `${seconds}s`
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-1/4 mb-4"></div>
          <div className="grid gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-black flex items-center">
            <Bot className="h-7 w-7 mr-2" />
            Autopilot Settings
          </h1>
          <p className="text-gray-500">
            Configure AI-powered automatic replies to target users' tweets
          </p>
        </div>
        <div className="flex space-x-3">
          {settings.isEnabled && (
            <Button 
              variant="outline" 
              onClick={emergencyPause}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Pause className="h-4 w-4 mr-2" />
              Emergency Pause
            </Button>
          )}
          <Button 
            onClick={saveAutopilotSettings}
            disabled={saving}
            className="bg-black text-white hover:bg-gray-800"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      <Alert className={settings.isEnabled ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
        <Zap className={`h-4 w-4 ${settings.isEnabled ? "text-green-600" : "text-yellow-600"}`} />
        <AlertDescription className={settings.isEnabled ? "text-green-800" : "text-yellow-800"}>
          {settings.isEnabled 
            ? "🤖 Autopilot is ACTIVE - AI will automatically reply to target users' tweets"
            : "⏸️ Autopilot is PAUSED - No automatic replies will be sent"
          }
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {/* Main Control */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Autopilot Control
            </CardTitle>
            <CardDescription>
              Enable or disable automatic AI replies to your target users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-black">Enable Autopilot</p>
                <p className="text-sm text-gray-500">
                  When enabled, AI will automatically generate and schedule replies
                </p>
              </div>
              <Switch
                checked={settings.isEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, isEnabled: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rate Limiting & Compliance */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Rate Limits & Compliance
            </CardTitle>
            <CardDescription>
              X ToS-compliant limits to prevent account suspension
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="maxRepliesPerDay">Max Replies Per Day</Label>
                <Input
                  id="maxRepliesPerDay"
                  type="number"
                  min="1"
                  max="50"
                  value={settings.maxRepliesPerDay}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    maxRepliesPerDay: Math.min(50, Math.max(1, parseInt(e.target.value) || 1))
                  }))}
                />
                <p className="text-xs text-gray-500">Maximum: 50 (recommended: 30)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxRepliesPerHour">Max Replies Per Hour</Label>
                <Input
                  id="maxRepliesPerHour"
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxRepliesPerHour}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    maxRepliesPerHour: Math.min(10, Math.max(1, parseInt(e.target.value) || 1))
                  }))}
                />
                <p className="text-xs text-gray-500">Maximum: 10 (recommended: 5)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minDelayBetweenReplies">Min Delay Between Replies</Label>
                <Input
                  id="minDelayBetweenReplies"
                  type="number"
                  min="300"
                  value={settings.minDelayBetweenReplies}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    minDelayBetweenReplies: Math.max(300, parseInt(e.target.value) || 300)
                  }))}
                />
                <p className="text-xs text-gray-500">
                  {formatDelay(settings.minDelayBetweenReplies)} (minimum: 5 minutes)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minDelayToSameUser">Min Delay to Same User</Label>
                <Input
                  id="minDelayToSameUser"
                  type="number"
                  min="600"
                  value={settings.minDelayToSameUser}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    minDelayToSameUser: Math.max(600, parseInt(e.target.value) || 600)
                  }))}
                />
                <p className="text-xs text-gray-500">
                  {formatDelay(settings.minDelayToSameUser)} (minimum: 10 minutes)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Settings */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Active Hours & Days
            </CardTitle>
            <CardDescription>
              When autopilot should be active
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="enabledHours">Active Hours (24-hour format)</Label>
              <Input
                id="enabledHours"
                value={settings.enabledHours}
                onChange={(e) => setSettings(prev => ({ ...prev, enabledHours: e.target.value }))}
                placeholder="09:00-17:00"
              />
              <p className="text-xs text-gray-500">Format: HH:MM-HH:MM (e.g., 09:00-17:00)</p>
            </div>

            <div className="space-y-2">
              <Label>Active Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    variant={settings.enabledDays.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(day.value)}
                    className={settings.enabledDays.includes(day.value) 
                      ? "bg-black text-white" 
                      : "border-gray-200 text-black hover:bg-gray-50"
                    }
                  >
                    {day.label.slice(0, 3)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Targeting Filters */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Tweet Filtering
            </CardTitle>
            <CardDescription>
              Filter which tweets to reply to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="targetSentimentFilter">Target Sentiment</Label>
                <Select 
                  value={settings.targetSentimentFilter} 
                  onValueChange={(value) => setSettings(prev => ({ ...prev, targetSentimentFilter: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiments</SelectItem>
                    <SelectItem value="positive">Positive Only</SelectItem>
                    <SelectItem value="neutral">Neutral Only</SelectItem>
                    <SelectItem value="negative">Negative Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTweetAge">Max Tweet Age (minutes)</Label>
                <Input
                  id="maxTweetAge"
                  type="number"
                  min="60"
                  max="4320"
                  value={settings.maxTweetAge}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    maxTweetAge: Math.min(4320, Math.max(60, parseInt(e.target.value) || 60))
                  }))}
                />
                <p className="text-xs text-gray-500">
                  {settings.maxTweetAge >= 1440 
                    ? `${Math.floor(settings.maxTweetAge / 1440)} days`
                    : `${Math.floor(settings.maxTweetAge / 60)} hours`
                  } (max: 3 days)
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-black">Skip Retweets</p>
                  <p className="text-sm text-gray-500">Only reply to original content</p>
                </div>
                <Switch
                  checked={settings.skipRetweets}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, skipRetweets: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-black">Skip Replies</p>
                  <p className="text-sm text-gray-500">Only reply to main tweets, not reply threads</p>
                </div>
                <Switch
                  checked={settings.skipReplies}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, skipReplies: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-black">Verified Users Only</p>
                  <p className="text-sm text-gray-500">Only reply to verified accounts</p>
                </div>
                <Switch
                  checked={settings.onlyReplyToVerified}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, onlyReplyToVerified: checked }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Safety Settings */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Safety & Monitoring
            </CardTitle>
            <CardDescription>
              Automatic safety measures and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-black">Auto-pause if blocked</p>
                <p className="text-sm text-gray-500">Automatically pause if account gets blocked</p>
              </div>
              <Switch
                checked={settings.pauseIfBlocked}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pauseIfBlocked: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-black">Auto-pause if rate limited</p>
                <p className="text-sm text-gray-500">Automatically pause if hitting rate limits</p>
              </div>
              <Switch
                checked={settings.pauseIfRateLimited}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pauseIfRateLimited: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-black">Email notifications</p>
                <p className="text-sm text-gray-500">Get notified when autopilot pauses or has issues</p>
              </div>
              <Switch
                checked={settings.notifyOnPause}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notifyOnPause: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Usage Preview */}
        <Card className="border-blue-100 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Expected Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-900">{settings.maxRepliesPerDay}</p>
                <p className="text-blue-700 text-sm">Max Daily Replies</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{settings.maxRepliesPerHour}</p>
                <p className="text-blue-700 text-sm">Max Hourly Replies</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{formatDelay(settings.minDelayBetweenReplies)}</p>
                <p className="text-blue-700 text-sm">Min Delay</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}