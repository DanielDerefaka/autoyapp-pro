'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useNotificationPreferences, useUpdateNotificationPreferences, useSendNotification } from '@/hooks/use-notifications'
import { Loader2, Mail, Bell, Shield, TrendingUp, AlertTriangle } from 'lucide-react'

export function NotificationPreferences() {
  const { toast } = useToast()
  const { data: notificationData, isLoading } = useNotificationPreferences()
  const updatePreferences = useUpdateNotificationPreferences()
  const sendNotification = useSendNotification()
  const [isTestingEmail, setIsTestingEmail] = useState(false)

  const [preferences, setPreferences] = useState(() => {
    if (notificationData?.preferences) {
      return notificationData.preferences
    }
    return {
      dailyDigest: true,
      complianceAlerts: true,
      successNotifications: true,
      errorAlerts: true,
      weeklyReports: true,
    }
  })

  const handleSavePreferences = async () => {
    try {
      await updatePreferences.mutateAsync(preferences)
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleTestEmail = async () => {
    setIsTestingEmail(true)
    try {
      await sendNotification.mutateAsync({
        type: 'welcome',
        data: {}
      })
      toast({
        title: "Test email sent!",
        description: "Check your inbox for the test email.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsTestingEmail(false)
    }
  }

  const handlePreferenceChange = (key: keyof typeof preferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Manage your email notification preferences and stay updated on your automation activity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Address Display */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{notificationData?.user.email}</span>
        </div>

        {/* Notification Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Daily Digest
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive a daily summary of your automation activity and engagement metrics.
              </p>
            </div>
            <Switch
              checked={preferences.dailyDigest}
              onCheckedChange={(checked) => handlePreferenceChange('dailyDigest', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-500" />
                Compliance Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified about rate limits, content warnings, and compliance issues.
              </p>
            </div>
            <Switch
              checked={preferences.complianceAlerts}
              onCheckedChange={(checked) => handlePreferenceChange('complianceAlerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-green-500" />
                Success Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Celebrate when your replies receive high engagement and perform well.
              </p>
            </div>
            <Switch
              checked={preferences.successNotifications}
              onCheckedChange={(checked) => handlePreferenceChange('successNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Error Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Get immediately notified when automation errors occur that need attention.
              </p>
            </div>
            <Switch
              checked={preferences.errorAlerts}
              onCheckedChange={(checked) => handlePreferenceChange('errorAlerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                Weekly Reports
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive comprehensive weekly performance reports and insights.
              </p>
            </div>
            <Switch
              checked={preferences.weeklyReports}
              onCheckedChange={(checked) => handlePreferenceChange('weeklyReports', checked)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSavePreferences}
            disabled={updatePreferences.isPending}
            className="flex-1"
          >
            {updatePreferences.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
          
          <Button
            variant="outline"
            onClick={handleTestEmail}
            disabled={isTestingEmail}
          >
            {isTestingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Email
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
          💡 <strong>Tip:</strong> We recommend keeping compliance alerts and error notifications enabled 
          to ensure your automation runs smoothly and stays within X's terms of service.
        </div>
      </CardContent>
    </Card>
  )
}