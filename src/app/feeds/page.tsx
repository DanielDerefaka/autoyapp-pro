'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Heart, Repeat2, Share, Clock, User, Bot, Send, Filter, RefreshCw, Eye, Download, AlertCircle } from 'lucide-react'
import { useTargets } from '@/hooks/use-targets'
import { useTweets, useScrapeTweets } from '@/hooks/use-tweets'
import { toast } from 'sonner'

export default function FeedsPage() {
  const [selectedTarget, setSelectedTarget] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('recent')
  const [filterSentiment, setFilterSentiment] = useState<string>('all')
  const [selectedTweet, setSelectedTweet] = useState<any>(null)
  const [generatedReply, setGeneratedReply] = useState('')
  const [isGeneratingReply, setIsGeneratingReply] = useState(false)
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false)

  const { data: targetsData, isLoading: isTargetsLoading } = useTargets()
  const tweetFilters = {
    targetUserId: selectedTarget !== 'all' ? selectedTarget : undefined,
    sortBy: sortBy as 'recent' | 'popular' | 'engagement',
    sentiment: filterSentiment !== 'all' ? (filterSentiment as 'positive' | 'negative' | 'neutral') : undefined,
    limit: 50 // Get more tweets
  }
  
  console.log('🔍 Feed page - Tweet filters:', tweetFilters)
  console.log('🔍 Feed page - Selected target:', selectedTarget)
  
  const { data: tweetsData, isLoading: isTweetsLoading, refetch } = useTweets(tweetFilters)
  const scrapeTweets = useScrapeTweets()

  const targets = targetsData || []
  const tweets = tweetsData?.tweets || []

  // Only refetch when selected target changes (not on every render)
  useEffect(() => {
    console.log('Selected target changed to:', selectedTarget)
  }, [selectedTarget])

  // Auto-fetch tweets if we have targets but no tweets
  useEffect(() => {
    if (targets.length > 0 && tweets.length === 0 && !isTweetsLoading) {
      console.log('Auto-fetching tweets since we have targets but no tweets')
      handleFetchRealTweets()
    }
  }, [targets.length, tweets.length, isTweetsLoading])

  const handleGenerateReply = async (tweet: any) => {
    setSelectedTweet(tweet)
    setIsGeneratingReply(true)
    setIsReplyDialogOpen(true)

    try {
      const response = await fetch('/api/replies/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweetId: tweet.id,
          tweetContent: tweet.content,
          targetUsername: tweet.targetUser.targetUsername,
          context: {
            authorUsername: tweet.authorUsername,
            sentiment: tweet.sentimentScore
          }
        }),
      })

      if (!response.ok) throw new Error('Failed to generate reply')
      
      const data = await response.json()
      setGeneratedReply(data.reply)
      toast.success('Reply generated successfully!')
    } catch (error) {
      toast.error('Failed to generate reply')
      setGeneratedReply('')
    } finally {
      setIsGeneratingReply(false)
    }
  }

  const handleScheduleReply = async () => {
    if (!selectedTweet || !generatedReply.trim()) return

    try {
      const response = await fetch('/api/replies/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweetId: selectedTweet.id,
          replyContent: generatedReply,
          scheduledFor: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
        }),
      })

      if (!response.ok) throw new Error('Failed to schedule reply')
      
      toast.success('Reply scheduled successfully!')
      setIsReplyDialogOpen(false)
      setSelectedTweet(null)
      setGeneratedReply('')
    } catch (error) {
      toast.error('Failed to schedule reply')
    }
  }

  const handleFetchRealTweets = async () => {
    if (targets.length === 0) {
      toast.error('Please add target users first')
      return
    }

    try {
      console.log(`🔍 Fetching tweets from ${targets.length} target users:`, targets.map(t => t.targetUsername))
      toast.info(`Fetching latest tweets from ${targets.length} target users...`)
      
      const response = await fetch('/api/tweets/fetch-real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-cache'
      })

      const data = await response.json()
      console.log('🔍 Fetch response:', data)

      if (!response.ok) {
        // If X API isn't configured, show helpful message
        if (data.error && data.error.includes('Bearer Token')) {
          toast.error('X API credentials needed. See setup instructions below.')
          return
        }
        throw new Error(data.error || 'Failed to fetch tweets')
      }

      if (data.totalNewTweets > 0) {
        toast.success(`Found ${data.totalNewTweets} new tweets from ${data.results?.length || 0} users!`)
      } else {
        toast.info('No new tweets found. Your targets may not have posted recently.')
      }
      
      // Always refresh to show any existing tweets
      console.log('🔄 Refetching tweets after fetch...')
      refetch()
    } catch (error) {
      console.error('Error fetching real tweets:', error)
      toast.error('Failed to fetch tweets. Please try again or check your setup.')
    }
  }

  const getSentimentColor = (score: number | null) => {
    if (!score) return 'bg-gray-100 text-gray-600'
    if (score > 0.1) return 'bg-green-100 text-green-600'
    if (score < -0.1) return 'bg-red-100 text-red-600'
    return 'bg-yellow-100 text-yellow-600'
  }

  const getSentimentLabel = (score: number | null) => {
    if (!score) return 'Neutral'
    if (score > 0.1) return 'Positive'
    if (score < -0.1) return 'Negative'
    return 'Neutral'
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (isTargetsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-1/4 mb-4"></div>
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded"></div>
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
          <p className="text-gray-500 text-sm">
            {tweets.length} tweets from {targets.length} targets • 
            {selectedTarget !== 'all' 
              ? ` Showing: ${targets.find(t => t.id === selectedTarget)?.targetUsername || 'Unknown'} • ` 
              : ' Showing: All targets • '
            }
            Last updated {new Date().toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={selectedTarget} onValueChange={setSelectedTarget}>
            <SelectTrigger className="w-40 border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Targets</SelectItem>
              {targets.map((target) => (
                <SelectItem key={target.id} value={target.id}>
                  @{target.targetUsername}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterSentiment} onValueChange={setFilterSentiment}>
            <SelectTrigger className="w-32 border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Moods</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleFetchRealTweets}
            disabled={isTweetsLoading || targets.length === 0}
            className="border-gray-200 text-black hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Fetch Real Tweets
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              // First fetch new tweets, then refresh the display
              await handleFetchRealTweets()
              refetch()
            }}
            disabled={isTweetsLoading}
            className="border-gray-200 text-black hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tweets Feed */}
      {isTweetsLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="border-gray-100">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-100 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded"></div>
                    <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-100 rounded w-4/6"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tweets.length > 0 ? (
        <div className="space-y-4">
          {tweets.map((tweet) => (
            <Card key={tweet.id} className="border-gray-100 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-black">@{tweet.authorUsername}</p>
                        <Badge variant="outline" className="text-xs text-gray-600 border-gray-200">
                          Target: @{tweet.targetUser.targetUsername}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs border ${getSentimentColor(tweet.sentimentScore)}`}
                        >
                          {getSentimentLabel(tweet.sentimentScore)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatRelativeTime(tweet.publishedAt)}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleGenerateReply(tweet)}
                    className="bg-black text-white hover:bg-gray-800"
                    size="sm"
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Generate Reply
                  </Button>
                </div>

                <div className="mb-4">
                  <p className="text-black leading-relaxed">{tweet.content}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-6 text-gray-500">
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm">{tweet.replyCount}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Repeat2 className="h-4 w-4" />
                      <span className="text-sm">{tweet.retweetCount}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="h-4 w-4" />
                      <span className="text-sm">{tweet.likeCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-black"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View on X
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="border-gray-100">
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-black mb-2">No tweets found</h3>
              <p className="text-gray-500 mb-6">
                {targets.length === 0 
                  ? "Add target users to start monitoring their tweets."
                  : "Click 'Fetch Real Tweets' to get the latest posts from your target users."
                }
              </p>
              {targets.length === 0 ? (
                <Button className="bg-black text-white hover:bg-gray-800">
                  Add Target Users
                </Button>
              ) : (
                <Button 
                  onClick={handleFetchRealTweets}
                  className="bg-black text-white hover:bg-gray-800"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Fetch Real Tweets
                </Button>
              )}
            </CardContent>
          </Card>

          {targets.length > 0 && (
            <Card className="border-blue-100 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">X API Setup Required</h4>
                    <p className="text-blue-800 text-sm mb-3">
                      To fetch real tweets from your target users, you need to configure X API credentials:
                    </p>
                    <div className="space-y-2 text-sm text-blue-800">
                      <p>1. Create a X Developer account at <a href="https://developer.twitter.com" target="_blank" rel="noopener" className="underline font-medium">developer.twitter.com</a></p>
                      <p>2. Create a new app and get your Bearer Token</p>
                      <p>3. Add these environment variables to your <code className="bg-blue-100 px-1 rounded">.env.local</code>:</p>
                      <div className="bg-blue-100 p-3 rounded mt-2 font-mono text-xs">
                        X_API_KEY=your_api_key<br />
                        X_API_SECRET=your_api_secret<br />
                        X_BEARER_TOKEN=your_bearer_token
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Reply Generation Dialog */}
      <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
        <DialogContent className="border-gray-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-black">Generate AI Reply</DialogTitle>
            <DialogDescription className="text-gray-500">
              AI-generated reply for @{selectedTweet?.authorUsername}'s tweet
            </DialogDescription>
          </DialogHeader>

          {selectedTweet && (
            <div className="space-y-4">
              {/* Original Tweet */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-black">@{selectedTweet.authorUsername}</span>
                  <span className="text-sm text-gray-500">
                    {formatRelativeTime(selectedTweet.publishedAt)}
                  </span>
                </div>
                <p className="text-gray-700">{selectedTweet.content}</p>
              </div>

              {/* Generated Reply */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">AI Generated Reply:</label>
                {isGeneratingReply ? (
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="animate-pulse flex items-center space-x-2">
                      <Bot className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">Generating personalized reply...</span>
                    </div>
                  </div>
                ) : (
                  <Textarea
                    value={generatedReply}
                    onChange={(e) => setGeneratedReply(e.target.value)}
                    placeholder="Generated reply will appear here..."
                    className="border-gray-200 focus:border-black min-h-24"
                    rows={4}
                  />
                )}
              </div>

              {/* Character count */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {generatedReply.length}/280 characters
                </span>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsReplyDialogOpen(false)}
                    className="border-gray-200 text-black hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleScheduleReply}
                    disabled={!generatedReply.trim() || isGeneratingReply}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Schedule Reply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}