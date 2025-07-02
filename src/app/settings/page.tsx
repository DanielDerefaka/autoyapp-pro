'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@clerk/nextjs'
import { NotificationPreferences } from '@/components/settings/notification-preferences'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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
    <div className="space-y-6">
      <div className="grid gap-6">
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black">X Account Connection</CardTitle>
            <CardDescription className="text-gray-500">
              Connect your X (Twitter) account to enable automation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                {xAccount ? (
                  <>
                    <p className="font-medium text-black">@{xAccount.username}</p>
                    <p className="text-sm text-gray-500">
                      X account connected and active
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-black">No X account connected</p>
                    <p className="text-sm text-gray-500">
                      Connect your X account to start using AutoYapp Pro
                    </p>
                  </>
                )}
              </div>
              <div className="flex space-x-2">
                {xAccount ? (
                  <Button variant="outline" onClick={handleDisconnectX} className="border-gray-200 text-black hover:bg-gray-50">
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={handleConnectX} disabled={isConnecting} className="bg-black text-white hover:bg-gray-800">
                    {isConnecting ? 'Connecting...' : 'Connect X Account'}
                  </Button>
                )}
                <Button variant="outline" onClick={fetchXAccount} className="border-gray-200 text-black hover:bg-gray-50">
                  Refresh Status
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black">Automation Settings</CardTitle>
            <CardDescription className="text-gray-500">
              Configure your automation preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-black">Auto-reply</p>
                <p className="text-sm text-gray-500">
                  Automatically send generated replies
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-500">Disabled</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-black">Reply delay</p>
                <p className="text-sm text-gray-500">
                  Minimum delay between replies
                </p>
              </div>
              <span className="text-sm font-medium text-black">5 minutes</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-black">Daily reply limit</p>
                <p className="text-sm text-gray-500">
                  Maximum replies per day
                </p>
              </div>
              <span className="text-sm font-medium text-black">50</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black">Subscription</CardTitle>
            <CardDescription className="text-gray-500">
              Manage your subscription and billing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-black">Free Plan</p>
                <p className="text-sm text-gray-500">
                  Limited features and usage
                </p>
              </div>
              <Button variant="outline" className="border-gray-200 text-black hover:bg-gray-50">Upgrade</Button>
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
    <Suspense fallback={<div className="space-y-8"><div className="animate-pulse">Loading settings...</div></div>}>
      <SettingsContent />
    </Suspense>
  )
}