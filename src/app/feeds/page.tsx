'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Heart, Repeat2, Share, Clock, User, Bot, Send, Filter, RefreshCw, Eye, Download, AlertCircle, MoreHorizontal, Bookmark, ExternalLink, Sparkles, TrendingUp, MessageCircle, Users, Settings, Search, Plus } from 'lucide-react'
import { useTargets, useTweets, useFetchTweets, useGenerateReply, useQueueReply } from '@/hooks/use-api'
import { toast } from 'sonner'

export default function FeedsPage() {
  const [selectedTarget, setSelectedTarget] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('recent')
  const [filterSentiment, setFilterSentiment] = useState<string>('all')
  const [selectedTweet, setSelectedTweet] = useState<any>(null)
  const [generatedReply, setGeneratedReply] = useState('')
  const [isGeneratingReply, setIsGeneratingReply] = useState(false)
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false)
  const [scrapingStatus, setScrapingStatus] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [likedTweets, setLikedTweets] = useState<Set<string>>(new Set())
  const [bookmarkedTweets, setBookmarkedTweets] = useState<Set<string>>(new Set())

  const { data: targetsData, isLoading: isTargetsLoading } = useTargets()
  const tweetFilters = {
    targetUserId: selectedTarget !== 'all' ? selectedTarget : undefined,
    sortBy: sortBy as 'recent' | 'popular' | 'engagement',
    sentiment: filterSentiment !== 'all' ? (filterSentiment as 'positive' | 'negative' | 'neutral') : undefined,
    limit: 50
  }
  
  const { data: tweetsData, isLoading: isTweetsLoading, refetch } = useTweets(tweetFilters)
  const fetchTweets = useFetchTweets()
  const generateReply = useGenerateReply()
  const queueReply = useQueueReply()

  const targets = targetsData?.data || []
  const tweets = tweetsData?.tweets || []

  // Filter tweets based on search query
  const filteredTweets = tweets.filter(tweet => 
    !searchQuery || 
    tweet.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tweet.authorUsername.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleLike = (tweetId: string) => {
    setLikedTweets(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tweetId)) {
        newSet.delete(tweetId)
      } else {
        newSet.add(tweetId)
      }
      return newSet
    })
  }

  const handleBookmark = (tweetId: string) => {
    setBookmarkedTweets(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tweetId)) {
        newSet.delete(tweetId)
      } else {
        newSet.add(tweetId)
      }
      return newSet
    })
  }

  const handleGenerateReply = async (tweet: any) => {
    setSelectedTweet(tweet)
    setIsGeneratingReply(true)
    setIsReplyDialogOpen(true)

    try {
      const data = await generateReply.mutateAsync({
        tweetId: tweet.id,
        tweetContent: tweet.content,
        targetUsername: tweet.targetUser.targetUsername,
        context: {
          authorUsername: tweet.authorUsername,
          sentiment: tweet.sentimentScore
        }
      })
      
      setGeneratedReply(data.reply)
      
      if (data.fallback) {
        toast.success('Reply generated using template (AI unavailable)')
      } else {
        toast.success('AI-powered reply generated successfully!')
      }
    } catch (error) {
      // Error handling is done by the hook
      setGeneratedReply('')
    } finally {
      setIsGeneratingReply(false)
    }
  }

  const handleScheduleReply = async () => {
    if (!selectedTweet || !generatedReply.trim()) return

    try {
      await queueReply.mutateAsync({
        tweetId: selectedTweet.id,
        replyContent: generatedReply,
        scheduledFor: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      
      setIsReplyDialogOpen(false)
      setSelectedTweet(null)
      setGeneratedReply('')
    } catch (error) {
      // Error handling is done by the hook
    }
  }

  const handleFetchRealTweets = async () => {
    if (targets.length === 0) {
      toast.error('Please add target users first')
      return
    }

    try {
      toast.info(`Fetching latest tweets from ${targets.length} target users...`)
      await fetchTweets.mutateAsync()
    } catch (error) {
      // Error handling is done by the hook, but add specific message for API credentials
      if (error instanceof Error && error.message.includes('Bearer Token')) {
        toast.error('X API credentials needed. See setup instructions below.')
      }
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

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  if (isTargetsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-2xl mx-auto pt-8">
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-white/20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Feed
              </h1>
              <Badge variant="secondary" className="bg-blue-100/50 text-blue-700 border-blue-200/50">
                {filteredTweets.length} tweets
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchRealTweets}
                disabled={isTweetsLoading || fetchTweets.isPending || targets.length === 0}
                className="glass border-white/20 hover:bg-blue-50/50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${fetchTweets.isPending ? 'animate-spin' : ''}`} />
                {fetchTweets.isPending ? 'Syncing...' : 'Sync'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="glass border-white/20 hover:bg-blue-50/50"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="glass rounded-2xl p-4 mb-6 border border-white/20">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-white/50 rounded-full px-3 py-1">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search tweets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 bg-transparent focus:outline-none focus:ring-0 text-sm"
              />
            </div>
            
            <Select value={selectedTarget} onValueChange={setSelectedTarget}>
              <SelectTrigger className="w-32 bg-white/50 border-white/20 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {targets.map((target) => (
                  <SelectItem key={target.id} value={target.id}>
                    @{target.targetUsername}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 bg-white/50 border-white/20 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="engagement">Top</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Feed */}
        {isTweetsLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass rounded-2xl p-6 animate-pulse border border-white/20">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTweets.length > 0 ? (
          <div className="space-y-4">
            {filteredTweets.map((tweet) => (
              <div key={tweet.id} className="glass rounded-2xl p-6 border border-white/20 hover:border-blue-200/50 transition-all duration-200 hover:shadow-lg">
                {/* Tweet Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">@{tweet.authorUsername}</h3>
                        <span className="text-gray-500 text-sm">·</span>
                        <span className="text-gray-500 text-sm">{formatRelativeTime(tweet.publishedAt)}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-blue-50/50 text-blue-700 dark:text-white border-blue-200/50">
                          @{tweet.targetUser.targetUsername}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getSentimentColor(tweet.sentimentScore)}`}
                        >
                          {getSentimentLabel(tweet.sentimentScore)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full hover:bg-blue-50/50"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                {/* Tweet Content */}
                <div className="mb-4 px-2">
                  <p className="text-gray-900 dark:text-white leading-relaxed text-sm">{tweet.content}</p>
                </div>

                {/* Tweet Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-white/20">
                  <div className="flex items-center space-x-8">
                    <button 
                      className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 transition-colors group"
                      onClick={() => handleGenerateReply(tweet)}
                    >
                      <div className="p-2 rounded-full group-hover:bg-blue-50/50">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      <span className="text-sm">{tweet.replyCount}</span>
                    </button>
                    
                    <button className="flex items-center space-x-2 text-gray-500 hover:text-green-600 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-green-50/50">
                        <Repeat2 className="h-5 w-5" />
                      </div>
                      <span className="text-sm">{tweet.retweetCount}</span>
                    </button>
                    
                    <button 
                      className={`flex items-center space-x-2 transition-colors group ${
                        likedTweets.has(tweet.id) ? 'text-red-500' : 'text-gray-500 hover:text-red-600'
                      }`}
                      onClick={() => handleLike(tweet.id)}
                    >
                      <div className="p-2 rounded-full group-hover:bg-red-50/50">
                        <Heart className={`h-5 w-5 ${likedTweets.has(tweet.id) ? 'fill-current' : ''}`} />
                      </div>
                      <span className="text-sm">{tweet.likeCount + (likedTweets.has(tweet.id) ? 1 : 0)}</span>
                    </button>
                    
                    <button 
                      className={`flex items-center space-x-2 transition-colors group ${
                        bookmarkedTweets.has(tweet.id) ? 'text-blue-500' : 'text-gray-500 hover:text-blue-600'
                      }`}
                      onClick={() => handleBookmark(tweet.id)}
                    >
                      <div className="p-2 rounded-full group-hover:bg-blue-50/50">
                        <Bookmark className={`h-5 w-5 ${bookmarkedTweets.has(tweet.id) ? 'fill-current' : ''}`} />
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleGenerateReply(tweet)}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full px-4 py-2"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Reply
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/50 border-white/20 hover:bg-white/70 rounded-full"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="glass rounded-2xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No tweets found</h3>
              <p className="text-gray-500 mb-6">
                {targets.length === 0 
                  ? "Add target users to start monitoring their tweets."
                  : searchQuery 
                    ? "No tweets match your search query."
                    : "Click 'Sync' to get the latest posts from your target users."
                }
              </p>
              {targets.length === 0 ? (
                <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full px-6 py-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Target Users
                </Button>
              ) : (
                <Button 
                  onClick={handleFetchRealTweets}
                  disabled={fetchTweets.isPending}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full px-6 py-2"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${fetchTweets.isPending ? 'animate-spin' : ''}`} />
                  {fetchTweets.isPending ? 'Syncing...' : 'Sync Tweets'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reply Generation Dialog */}
      <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
        <DialogContent className="glass border-white/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
              Generate AI Reply
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              AI-generated reply for @{selectedTweet?.authorUsername}'s tweet
            </DialogDescription>
          </DialogHeader>

          {selectedTweet && (
            <div className="space-y-4">
              {/* Original Tweet */}
              <div className="bg-white/50 rounded-xl p-4 border border-white/20">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">@{selectedTweet.authorUsername}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      {formatRelativeTime(selectedTweet.publishedAt)}
                    </span>
                  </div>
                </div>
                <p className="text-gray-800 leading-relaxed">{selectedTweet.content}</p>
              </div>

              {/* Generated Reply */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-900 flex items-center">
                  <Bot className="h-4 w-4 mr-2 text-blue-500" />
                  AI Generated Reply:
                </label>
                {isGeneratingReply ? (
                  <div className="bg-white/50 rounded-xl p-4 border border-white/20">
                    <div className="animate-pulse flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <span className="text-gray-500 ml-2">Generating viral reply...</span>
                    </div>
                  </div>
                ) : (
                  <Textarea
                    value={generatedReply}
                    onChange={(e) => setGeneratedReply(e.target.value)}
                    placeholder="Generated reply will appear here..."
                    className="bg-white/50 border-white/20 focus:border-blue-300 min-h-24 rounded-xl"
                    rows={4}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-white/20">
                <span className="text-sm text-gray-500">
                  {generatedReply.length}/280 characters
                </span>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsReplyDialogOpen(false)}
                    className="bg-white/50 border-white/20 hover:bg-white/70 rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleScheduleReply}
                    disabled={!generatedReply.trim() || isGeneratingReply || queueReply.isPending}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full px-6"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {queueReply.isPending ? 'Scheduling...' : 'Schedule Reply'}
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