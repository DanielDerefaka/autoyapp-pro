'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Twitter, 
  User, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface XAccount {
  id: string
  username: string
  isActive: boolean
  lastActivity: string | null
}

interface XAccountConnectionProps {
  onConnectionSuccess?: () => void
  showInline?: boolean
}

export function XAccountConnection({ onConnectionSuccess, showInline = false }: XAccountConnectionProps) {
  const { toast } = useToast()
  const [xAccounts, setXAccounts] = useState<XAccount[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchXAccounts()
  }, [])

  const fetchXAccounts = async () => {
    try {
      const response = await fetch('/api/x-accounts')
      if (response.ok) {
        const accounts = await response.json()
        setXAccounts(accounts)
      }
    } catch (error) {
      console.error('Error fetching X accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const connectXAccount = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch('/api/x-oauth/connect')
      if (response.ok) {
        const data = await response.json()
        
        // Redirect to X OAuth
        window.location.href = data.authUrl
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to initiate connection')
      }
    } catch (error) {
      console.error('Error connecting X account:', error)
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect X account",
        variant: "destructive"
      })
      setIsConnecting(false)
    }
  }

  const disconnectXAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/x-accounts/${accountId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast({
          title: "Account disconnected",
          description: "X account has been disconnected successfully"
        })
        fetchXAccounts()
      } else {
        throw new Error('Failed to disconnect account')
      }
    } catch (error) {
      console.error('Error disconnecting X account:', error)
      toast({
        title: "Disconnection failed",
        description: "Failed to disconnect X account",
        variant: "destructive"
      })
    }
  }

  const hasActiveConnection = xAccounts.some(account => account.isActive)

  if (showInline && hasActiveConnection) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="flex items-center justify-between">
            <span>Connected to @{xAccounts.find(a => a.isActive)?.username}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchXAccounts}
              className="text-green-700 hover:text-green-800"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (showInline && !hasActiveConnection) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="flex items-center justify-between">
            <span>Connect your X account to publish tweets</span>
            <Button
              size="sm"
              onClick={connectXAccount}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Twitter className="h-3 w-3 mr-1" />
                  Connect
                </>
              )}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Twitter className="h-5 w-5 mr-2" />
          X (Twitter) Account
        </CardTitle>
        <CardDescription>
          Connect your X account to publish tweets and manage automation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-500">Loading connections...</span>
          </div>
        ) : xAccounts.length === 0 ? (
          <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Twitter className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                No X account connected. Connect your account to start publishing tweets.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={connectXAccount}
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting to X...
                </>
              ) : (
                <>
                  <Twitter className="h-4 w-4 mr-2" />
                  Connect X Account
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {xAccounts.map((account) => (
              <div 
                key={account.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">@{account.username}</span>
                      {account.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {account.lastActivity && (
                      <p className="text-xs text-gray-500">
                        Last used: {new Date(account.lastActivity).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => disconnectXAccount(account.id)}
                    className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ))}
            
            <Button 
              variant="outline"
              onClick={connectXAccount}
              disabled={isConnecting}
              className="w-full border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Twitter className="h-4 w-4 mr-2" />
                  Connect Another Account
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}