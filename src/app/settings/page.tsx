'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@clerk/nextjs'
import { NotificationPreferences } from '@/components/settings/notification-preferences'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bot, ArrowRight, Zap, Settings, Twitter, Bell, CreditCard, Sliders } from 'lucide-react'
import Link from 'next/link'

function SettingsContent() {
  const { user, isLoaded } = useUser()
  const [isConnecting, setIsConnecting] = useState(false)
  const [xAccount, setXAccount] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for OAuth callback status
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    
    if (success === 'x_connected') {
      // Refresh X account data
      fetchXAccount()
    } else if (error) {
      console.error('OAuth error:', error)
    }
  }, [searchParams])

  const fetchXAccount = async () => {
    try {
      setIsLoading(true)
      console.log('Fetching X account status...')
      const response = await fetch('/api/x-oauth/status', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Full response data:', data)
      
      if (response.ok) {
        setXAccount(data.xAccount)
        console.log('X account set to:', data.xAccount)
      } else {
        console.error('API error:', data)
      }
    } catch (error) {
      console.error('Network error fetching X account:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const ensureUserExists = async () => {
    try {
      console.log('Ensuring user exists in database...')
      const response = await fetch('/api/auth/ensure-user', {
        method: 'POST',
        cache: 'no-cache'
      })
      const data = await response.json()
      console.log('User ensure response:', data)
      
      if (response.ok) {
        // Now fetch X account
        await fetchXAccount()
      }
    } catch (error) {
      console.error('Error ensuring user exists:', error)
    }
  }

  useEffect(() => {
    if (user && isLoaded) {
      console.log('User loaded, ensuring user exists for:', user.id)
      ensureUserExists()
    }
  }, [user, isLoaded])

  const handleConnectX = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch('/api/x-oauth/connect')
      const data = await response.json()
      
      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        throw new Error('Failed to get OAuth URL')
      }
    } catch (error) {
      console.error('Error connecting X account:', error)
      setIsConnecting(false)
    }
  }

  const handleDisconnectX = async () => {
    try {
      const response = await fetch('/api/x-oauth/disconnect', {
        method: 'POST'
      })
      
      if (response.ok) {
        setXAccount(null)
      }
    } catch (error) {
      console.error('Error disconnecting X account:', error)
    }
  }
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
          <div className="p-2 bg-gradient-to-br from-chart-5/20 to-primary/20 rounded-xl mr-3">
            <Settings className="h-8 w-8 text-primary" />
          </div>
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>
      
      <div className="grid gap-6">
        <Card className="border-border bg-card glass">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <div className="p-2 bg-primary/10 rounded-lg mr-3">
                <Twitter className="h-5 w-5 text-primary" />
              </div>
              X Account Connection
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Connect your X (Twitter) account to enable automation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                {xAccount ? (
                  <>
                    <p className="font-medium text-foreground">@{xAccount.username}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <p className="text-sm text-muted-foreground">
                        X account connected and active
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-foreground">No X account connected</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your X account to start using AutoYapp Pro
                    </p>
                  </>
                )}
              </div>
              <div className="flex space-x-2">
                {xAccount ? (
                  <Button variant="outline" onClick={handleDisconnectX} className="hover:scale-105 transition-all duration-200">
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={handleConnectX} disabled={isConnecting} className="shadow-lg hover:scale-105 transition-all duration-200">
                    {isConnecting ? 'Connecting...' : 'Connect X Account'}
                  </Button>
                )}
                <Button variant="outline" onClick={fetchXAccount} className="hover:scale-105 transition-all duration-200">
                  Refresh Status
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card glass">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <div className="p-2 bg-chart-2/10 rounded-lg mr-3">
                <Bot className="h-5 w-5 text-chart-2" />
              </div>
              AI Reply Styles
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Customize how AI generates replies to match your voice and personality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Reply Personalization</p>
                <p className="text-sm text-muted-foreground">
                  Configure tone, personality, topics, and custom instructions for AI-generated replies
                </p>
              </div>
              <Link href="/settings/reply-styles">
                <Button variant="outline" className="gap-2 hover:scale-105 transition-all duration-200">
                  Configure Styles
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card glass">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <div className="p-2 bg-chart-5/10 rounded-lg mr-3">
                <Zap className="h-5 w-5 text-chart-5" />
              </div>
              Autopilot Settings
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configure automatic AI-powered replies to target users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">AI Autopilot</p>
                <p className="text-sm text-muted-foreground">
                  Automatically monitor target users and generate contextual replies with X ToS compliance
                </p>
              </div>
              <Link href="/settings/autopilot">
                <Button variant="outline" className="gap-2 hover:scale-105 transition-all duration-200">
                  Configure Autopilot
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card glass">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <div className="p-2 bg-chart-3/10 rounded-lg mr-3">
                <Sliders className="h-5 w-5 text-chart-3" />
              </div>
              Automation Settings
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configure your automation preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
              <div>
                <p className="font-medium text-foreground">Auto-reply</p>
                <p className="text-sm text-muted-foreground">
                  Automatically send generated replies
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                <span className="text-sm text-muted-foreground">Disabled</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-chart-1/10">
              <div>
                <p className="font-medium text-foreground">Reply delay</p>
                <p className="text-sm text-muted-foreground">
                  Minimum delay between replies
                </p>
              </div>
              <span className="text-sm font-semibold text-foreground">5 minutes</span>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-chart-2/10">
              <div>
                <p className="font-medium text-foreground">Daily reply limit</p>
                <p className="text-sm text-muted-foreground">
                  Maximum replies per day
                </p>
              </div>
              <span className="text-sm font-semibold text-foreground">50</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card glass">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <div className="p-2 bg-chart-4/10 rounded-lg mr-3">
                <CreditCard className="h-5 w-5 text-chart-4" />
              </div>
              Subscription
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage your subscription and billing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/5 to-chart-4/5">
              <div>
                <p className="font-medium text-foreground">Free Plan</p>
                <p className="text-sm text-muted-foreground">
                  Limited features and usage
                </p>
              </div>
              <Button className="shadow-lg hover:scale-105 transition-all duration-200">Upgrade</Button>
            </div>
          </CardContent>
        </Card>

        <NotificationPreferences />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-8">
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border bg-card glass">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded-lg w-3/4 mb-4"></div>
                  <div className="h-8 bg-muted rounded-lg w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}