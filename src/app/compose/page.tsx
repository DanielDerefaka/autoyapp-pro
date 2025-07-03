'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TextareaWithAutocomplete } from '@/components/ui/textarea-with-autocomplete'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { XAccountConnection } from '@/components/x-account-connection'
import { 
  PenTool, 
  Plus, 
  Trash2, 
  Image, 
  Calendar,
  Send,
  Bot,
  Sparkles,
  Upload,
  X,
  Clock
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'

interface TweetDraft {
  id: string
  content: string
  images: File[]
  imageUrls: string[]
  characterCount: number
}

interface ThreadDraft {
  tweets: TweetDraft[]
}

export default function ComposePage() {
  const { toast } = useToast()
  const [threadDraft, setThreadDraft] = useState<ThreadDraft>({
    tweets: [
      {
        id: '1',
        content: '',
        images: [],
        imageUrls: [],
        characterCount: 0
      }
    ]
  })
  const [isScheduling, setIsScheduling] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAiGenerator, setShowAiGenerator] = useState(false)
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  const TWEET_LIMIT = 280

  const updateTweetContent = (tweetId: string, content: string) => {
    setThreadDraft(prev => ({
      ...prev,
      tweets: prev.tweets.map(tweet =>
        tweet.id === tweetId
          ? { ...tweet, content, characterCount: content.length }
          : tweet
      )
    }))
  }

  const addTweet = () => {
    const newTweet: TweetDraft = {
      id: Date.now().toString(),
      content: '',
      images: [],
      imageUrls: [],
      characterCount: 0
    }
    setThreadDraft(prev => ({
      ...prev,
      tweets: [...prev.tweets, newTweet]
    }))
  }

  const removeTweet = (tweetId: string) => {
    if (threadDraft.tweets.length === 1) return
    setThreadDraft(prev => ({
      ...prev,
      tweets: prev.tweets.filter(tweet => tweet.id !== tweetId)
    }))
  }

  const handleImageUpload = (tweetId: string, files: FileList) => {
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(file => file.type.startsWith('image/'))
    
    if (validFiles.length === 0) {
      toast({
        title: "Invalid files",
        description: "Please select only image files",
        variant: "destructive"
      })
      return
    }

    // Create preview URLs
    const newImageUrls = validFiles.map(file => URL.createObjectURL(file))
    
    setThreadDraft(prev => ({
      ...prev,
      tweets: prev.tweets.map(tweet =>
        tweet.id === tweetId
          ? { 
              ...tweet, 
              images: [...tweet.images, ...validFiles].slice(0, 4), // Max 4 images
              imageUrls: [...tweet.imageUrls, ...newImageUrls].slice(0, 4)
            }
          : tweet
      )
    }))
  }

  const removeImage = (tweetId: string, imageIndex: number) => {
    setThreadDraft(prev => ({
      ...prev,
      tweets: prev.tweets.map(tweet =>
        tweet.id === tweetId
          ? {
              ...tweet,
              images: tweet.images.filter((_, index) => index !== imageIndex),
              imageUrls: tweet.imageUrls.filter((_, index) => index !== imageIndex)
            }
          : tweet
      )
    }))
  }

  const generateAIContent = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Missing prompt",
        description: "Please enter a prompt for AI generation",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/generate-tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      })

      if (!response.ok) throw new Error('Failed to generate content')

      const data = await response.json()
      
      // Replace the first tweet with AI-generated content
      setThreadDraft(prev => ({
        ...prev,
        tweets: [
          {
            ...prev.tweets[0],
            content: data.content,
            characterCount: data.content.length
          },
          ...prev.tweets.slice(1)
        ]
      }))

      setAiPrompt('')
      setShowAiGenerator(false)
      toast({
        title: "Content generated",
        description: "AI has generated your tweet content"
      })
    } catch (error) {
      console.error('Error generating content:', error)
      toast({
        title: "Generation failed",
        description: "Failed to generate AI content. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const generateAIThread = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Missing prompt",
        description: "Please enter a prompt for AI generation",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/generate-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      })

      if (!response.ok) throw new Error('Failed to generate thread')

      const data = await response.json()
      
      // Replace entire thread with AI-generated content
      const newTweets = data.tweets.map((content: string, index: number) => ({
        id: (Date.now() + index).toString(),
        content,
        images: [],
        imageUrls: [],
        characterCount: content.length
      }))

      setThreadDraft({ tweets: newTweets })
      setAiPrompt('')
      setShowAiGenerator(false)
      toast({
        title: "Thread generated",
        description: `AI has generated a ${newTweets.length}-tweet thread`
      })
    } catch (error) {
      console.error('Error generating thread:', error)
      toast({
        title: "Generation failed",
        description: "Failed to generate AI thread. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const publishNow = async () => {
    try {
      const response = await fetch('/api/tweets/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweets: threadDraft.tweets })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.needsConnection) {
          toast({
            title: "X Account Required",
            description: data.message || "Please connect your X account first",
            variant: "destructive"
          })
          return
        }
        throw new Error(data.error || 'Failed to publish')
      }

      toast({
        title: "Published successfully",
        description: `Your ${threadDraft.tweets.length > 1 ? 'thread' : 'tweet'} has been published to X`
      })

      // Reset form
      setThreadDraft({
        tweets: [{
          id: '1',
          content: '',
          images: [],
          imageUrls: [],
          characterCount: 0
        }]
      })
    } catch (error) {
      console.error('Error publishing:', error)
      toast({
        title: "Publishing failed",
        description: error instanceof Error ? error.message : "Failed to publish your content. Please try again.",
        variant: "destructive"
      })
    }
  }

  const scheduleContent = async () => {
    if (!scheduledDate || !scheduledTime) {
      toast({
        title: "Missing schedule",
        description: "Please select both date and time for scheduling",
        variant: "destructive"
      })
      return
    }

    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
      
      const response = await fetch('/api/tweets/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tweets: threadDraft.tweets,
          scheduledFor: scheduledDateTime.toISOString()
        })
      })

      if (!response.ok) throw new Error('Failed to schedule')

      toast({
        title: "Scheduled successfully",
        description: `Your ${threadDraft.tweets.length > 1 ? 'thread' : 'tweet'} has been scheduled`
      })

      // Reset form
      setThreadDraft({
        tweets: [{
          id: '1',
          content: '',
          images: [],
          imageUrls: [],
          characterCount: 0
        }]
      })
      setIsScheduling(false)
      setScheduledDate('')
      setScheduledTime('')
    } catch (error) {
      console.error('Error scheduling:', error)
      toast({
        title: "Scheduling failed",
        description: "Failed to schedule your content. Please try again.",
        variant: "destructive"
      })
    }
  }

  const isValidForPublishing = threadDraft.tweets.every(tweet => 
    tweet.content.trim().length > 0 && tweet.content.length <= TWEET_LIMIT
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-chart-1/20 rounded-xl mr-3">
              <PenTool className="h-8 w-8 text-primary" />
            </div>
            Compose Tweet
          </h1>
          <p className="text-muted-foreground">
            Create engaging tweets and threads with AI assistance
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowAiGenerator(!showAiGenerator)}
            className="gap-2 hover:scale-105 transition-all duration-200"
          >
            <Bot className="h-4 w-4" />
            AI Assistant
          </Button>
          {threadDraft.tweets.length > 1 && (
            <Badge className="px-3 py-2 bg-primary/10 text-primary border-primary/20">
              {threadDraft.tweets.length} Tweets
            </Badge>
          )}
        </div>
      </div>

      {/* AI Generator */}
      {showAiGenerator && (
        <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <div className="p-2 bg-primary/10 rounded-lg mr-3">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              AI Content Generator
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Describe what you want to tweet about and let AI create the content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="E.g., 'Write a thread about the future of AI in marketing, include statistics and actionable tips'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="min-h-[100px] focus-ring"
            />
            <div className="flex space-x-3">
              <Button
                onClick={generateAIContent}
                disabled={isGenerating || !aiPrompt.trim()}
                className="shadow-lg hover:scale-105 transition-all duration-200"
              >
                {isGenerating ? 'Generating...' : 'Generate Tweet'}
              </Button>
              <Button
                onClick={generateAIThread}
                disabled={isGenerating || !aiPrompt.trim()}
                variant="outline"
                className="hover:scale-105 transition-all duration-200"
              >
                {isGenerating ? 'Generating...' : 'Generate Thread'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* X Account Connection Status */}
      <XAccountConnection showInline={true} />

      {/* Tweet Composer */}
      <div className="space-y-4">
        {threadDraft.tweets.map((tweet, index) => (
          <Card key={tweet.id} className="border-border bg-card glass">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-foreground flex items-center">
                  <div className="p-1 bg-chart-1/10 rounded-lg mr-2">
                    <PenTool className="h-4 w-4 text-chart-1" />
                  </div>
                  {threadDraft.tweets.length > 1 ? `Tweet ${index + 1}` : 'Tweet'}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={tweet.characterCount > TWEET_LIMIT ? "destructive" : "secondary"}
                    className="px-3 py-1 font-mono"
                  >
                    {tweet.characterCount}/{TWEET_LIMIT}
                  </Badge>
                  {threadDraft.tweets.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTweet(tweet.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 hover:scale-105 transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <TextareaWithAutocomplete
                placeholder="What's happening?"
                value={tweet.content}
                onValueChange={(value) => updateTweetContent(tweet.id, value)}
                className="min-h-[120px] resize-none focus-ring"
                enableAutocomplete={true}
                maxLength={TWEET_LIMIT}
              />
              
              {/* Image Upload */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    ref={(el) => fileInputRefs.current[tweet.id] = el}
                    onChange={(e) => e.target.files && handleImageUpload(tweet.id, e.target.files)}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRefs.current[tweet.id]?.click()}
                    disabled={tweet.images.length >= 4}
                    className="gap-2 hover:scale-105 transition-all duration-200"
                  >
                    <Image className="h-4 w-4" />
                    Add Image ({tweet.images.length}/4)
                  </Button>
                </div>
                
                {/* Image Previews */}
                {tweet.imageUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {tweet.imageUrls.map((url, imageIndex) => (
                      <div key={imageIndex} className="relative">
                        <img
                          src={url}
                          alt={`Preview ${imageIndex + 1}`}
                          className="w-full h-32 object-cover rounded-xl border border-border shadow-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeImage(tweet.id, imageIndex)}
                          className="absolute top-2 right-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-6 w-6 p-0 rounded-full shadow-sm hover:scale-110 transition-all duration-200"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {tweet.characterCount > TWEET_LIMIT && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Tweet exceeds character limit by {tweet.characterCount - TWEET_LIMIT} characters
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Tweet Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={addTweet}
          className="gap-2 hover:scale-105 transition-all duration-200 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Tweet to Thread
        </Button>
      </div>

      {/* Scheduling Section */}
      {isScheduling && (
        <Card className="border-border bg-card glass">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <div className="p-2 bg-chart-3/10 rounded-lg mr-3">
                <Clock className="h-5 w-5 text-chart-3" />
              </div>
              Schedule Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Date
                </label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="focus-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Time
                </label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="focus-ring"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setIsScheduling(!isScheduling)}
          className="gap-2 hover:scale-105 transition-all duration-200"
        >
          <Calendar className="h-4 w-4" />
          {isScheduling ? 'Cancel Schedule' : 'Schedule Later'}
        </Button>
        
        <div className="flex space-x-3">
          {isScheduling ? (
            <Button
              onClick={scheduleContent}
              disabled={!isValidForPublishing || !scheduledDate || !scheduledTime}
              className="gap-2 shadow-lg hover:scale-105 transition-all duration-200"
            >
              <Calendar className="h-4 w-4" />
              Schedule {threadDraft.tweets.length > 1 ? 'Thread' : 'Tweet'}
            </Button>
          ) : (
            <Button
              onClick={publishNow}
              disabled={!isValidForPublishing}
              className="gap-2 shadow-lg hover:scale-105 transition-all duration-200"
            >
              <Send className="h-4 w-4" />
              Publish {threadDraft.tweets.length > 1 ? 'Thread' : 'Tweet'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}