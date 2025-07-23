'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Bot, Save, RotateCcw, Sparkles, Users, MessageSquare, TrendingUp, User, Upload, Download, FileText } from 'lucide-react'
import ViralContentInterview from '@/components/ai-interview/viral-content-interview'

export default function ReplyStylesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [styles, setStyles] = useState({
    tone: 'professional',
    personality: 'supportive',
    length: 'medium',
    engagement_level: 'medium',
    topics_of_interest: ['technology', 'business', 'entrepreneurship'],
    avoid_topics: ['politics', 'controversial'],
    custom_instructions: '',
    examples: {
      positive_reply: "This is exciting! The progress you're making is really inspiring.",
      neutral_reply: "Great insights here. This really adds to the conversation.",
      negative_reply: "I understand the challenge. Have you considered approaching it from a different angle?"
    }
  })

  const [newTopic, setNewTopic] = useState('')
  const [newAvoidTopic, setNewAvoidTopic] = useState('')
  const [testContent, setTestContent] = useState('')
  const [testReply, setTestReply] = useState('')
  const [testReplyData, setTestReplyData] = useState<any>(null)
  const [generatingReply, setGeneratingReply] = useState(false)
  const [targetUsername, setTargetUsername] = useState('')
  const [analyzingTarget, setAnalyzingTarget] = useState(false)
  
  // Personal analysis state
  const [myTweets, setMyTweets] = useState('')
  const [myUsername, setMyUsername] = useState('')
  const [personalAnalysis, setPersonalAnalysis] = useState<any>(null)
  const [analyzingPersonal, setAnalyzingPersonal] = useState(false)
  const [fetchingTweets, setFetchingTweets] = useState(false)

  useEffect(() => {
    fetchReplyStyles()
  }, [])

  const fetchReplyStyles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reply-styles')
      const data = await response.json()
      
      if (response.ok) {
        setStyles(data.styles)
        if (data.tableNotExists) {
          toast.info('Using default settings (custom styles will be saved once you configure them)')
        }
      } else {
        toast.error('Failed to load reply styles')
      }
    } catch (error) {
      toast.error('Failed to load reply styles')
    } finally {
      setLoading(false)
    }
  }

  const saveReplyStyles = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/reply-styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styles })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success('Reply styles saved successfully!')
      } else {
        if (data.needsMigration) {
          toast.error('Database needs migration. Please contact support.')
        } else {
          toast.error(data.error || 'Failed to save reply styles')
        }
      }
    } catch (error) {
      toast.error('Failed to save reply styles')
    } finally {
      setSaving(false)
    }
  }

  const addTopic = () => {
    if (newTopic.trim() && !styles.topics_of_interest.includes(newTopic.trim())) {
      setStyles({
        ...styles,
        topics_of_interest: [...styles.topics_of_interest, newTopic.trim()]
      })
      setNewTopic('')
    }
  }

  const removeTopic = (topic: string) => {
    setStyles({
      ...styles,
      topics_of_interest: styles.topics_of_interest.filter(t => t !== topic)
    })
  }

  const addAvoidTopic = () => {
    if (newAvoidTopic.trim() && !styles.avoid_topics.includes(newAvoidTopic.trim())) {
      setStyles({
        ...styles,
        avoid_topics: [...styles.avoid_topics, newAvoidTopic.trim()]
      })
      setNewAvoidTopic('')
    }
  }

  const removeAvoidTopic = (topic: string) => {
    setStyles({
      ...styles,
      avoid_topics: styles.avoid_topics.filter(t => t !== topic)
    })
  }

  const resetToDefaults = () => {
    setStyles({
      tone: 'professional',
      personality: 'supportive',
      length: 'medium',
      engagement_level: 'medium',
      topics_of_interest: ['technology', 'business', 'entrepreneurship'],
      avoid_topics: ['politics', 'controversial'],
      custom_instructions: '',
      examples: {
        positive_reply: "This is exciting! The progress you're making is really inspiring.",
        neutral_reply: "Great insights here. This really adds to the conversation.",
        negative_reply: "I understand the challenge. Have you considered approaching it from a different angle?"
      }
    })
    toast.info('Reset to default settings')
  }

  const generateTestReply = async () => {
    if (!testContent.trim()) {
      toast.error('Please enter some content to reply to')
      return
    }

    try {
      setGeneratingReply(true)
      const response = await fetch('/api/replies/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweetContent: testContent,
          styles: styles
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setTestReply(data.reply)
        setTestReplyData(data)
        toast.success(`Test reply generated! (${data.strategy} strategy, ${Math.round(data.viralScore * 100)}% viral score)`)
      } else {
        toast.error(data.error || 'Failed to generate reply')
      }
    } catch (error) {
      toast.error('Failed to generate reply')
    } finally {
      setGeneratingReply(false)
    }
  }

  const analyzeTargetUser = async () => {
    if (!targetUsername.trim()) {
      toast.error('Please enter a username to analyze')
      return
    }

    try {
      setAnalyzingTarget(true)
      const response = await fetch('/api/targets/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: targetUsername.replace('@', '')
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success('Target user analyzed!')
        // Update styles based on analysis
        setStyles(prev => ({
          ...prev,
          custom_instructions: prev.custom_instructions + `\n\nAnalyzed @${targetUsername} style: ${data.analysis}`
        }))
      } else {
        toast.error(data.error || 'Failed to analyze target user')
      }
    } catch (error) {
      toast.error('Failed to analyze target user')
    } finally {
      setAnalyzingTarget(false)
    }
  }

  const analyzeMyTweets = async () => {
    if (!myTweets.trim()) {
      toast.error('Please paste some of your tweets to analyze')
      return
    }

    setAnalyzingPersonal(true)
    try {
      // Parse manual tweets (assuming each line is a tweet)
      const tweetLines = myTweets
        .split('\n')
        .filter(line => line.trim())
        .map((content, index) => ({
          id: `my_${index}`,
          content: content.trim(),
          timestamp: new Date().toISOString(),
          likes: 0,
          retweets: 0,
          replies: 0
        }))

      if (tweetLines.length < 3) {
        toast.error('Please provide at least 3 tweets for better analysis')
        return
      }

      // Send to analysis API
      const response = await fetch('/api/user-feed/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweets: tweetLines,
          source: 'manual'
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setPersonalAnalysis(data.analysis)
        toast.success(`Your writing style analyzed! (${tweetLines.length} tweets processed)`)
      } else {
        toast.error(data.error || 'Failed to analyze your tweets')
      }
    } catch (error) {
      toast.error('Failed to analyze your tweets')
      console.error('Analysis error:', error)
    } finally {
      setAnalyzingPersonal(false)
    }
  }

  const fetchMyTweets = async () => {
    if (!myUsername.trim()) {
      toast.error('Please enter your username')
      return
    }

    setFetchingTweets(true)
    try {
      // First fetch tweets
      const fetchResponse = await fetch('/api/user-feed/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: myUsername.replace('@', ''),
          count: 20
        })
      })

      const fetchData = await fetchResponse.json()
      
      if (!fetchResponse.ok) {
        toast.error(fetchData.error || 'Failed to fetch your tweets')
        return
      }

      // Then analyze the fetched tweets
      setAnalyzingPersonal(true)
      const analyzeResponse = await fetch('/api/user-feed/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweets: fetchData.tweets,
          source: 'rapidapi'
        })
      })

      const analyzeData = await analyzeResponse.json()
      
      if (analyzeResponse.ok) {
        setPersonalAnalysis(analyzeData.analysis)
        toast.success(`Fetched and analyzed ${fetchData.totalFetched} tweets from @${myUsername}!`)
      } else {
        toast.error(analyzeData.error || 'Failed to analyze tweets')
      }
    } catch (error) {
      toast.error('Failed to fetch and analyze tweets')
      console.error('Fetch error:', error)
    } finally {
      setFetchingTweets(false)
      setAnalyzingPersonal(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-1/4 mb-4"></div>
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-100 rounded"></div>
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
          <h1 className="text-2xl font-bold text-black">AI Reply System</h1>
          <p className="text-gray-500">
            Configure your AI reply styles, analyze target users, and create viral content
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={resetToDefaults}
            className="border-gray-200 text-black hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button 
            onClick={saveReplyStyles}
            disabled={saving}
            className="bg-black text-white hover:bg-gray-800"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="styles" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="styles" className="flex items-center">
            <Bot className="h-4 w-4 mr-2" />
            Reply Styles
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            Test Replies
          </TabsTrigger>
          <TabsTrigger value="my-analysis" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            My Analysis
          </TabsTrigger>
          <TabsTrigger value="analyze" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Target Analysis
          </TabsTrigger>
          <TabsTrigger value="viral" className="flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Viral Interview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="styles" className="space-y-6">

      <div className="grid gap-6">
        {/* Basic Style Settings */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <Bot className="h-5 w-5 mr-2" />
              Basic Style Settings
            </CardTitle>
            <CardDescription>
              Define the core personality and tone for your AI-generated replies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select value={styles.tone} onValueChange={(value) => setStyles({...styles, tone: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    <SelectItem value="thoughtful">Thoughtful</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personality">Personality</Label>
                <Select value={styles.personality} onValueChange={(value) => setStyles({...styles, personality: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supportive">Supportive</SelectItem>
                    <SelectItem value="analytical">Analytical</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="length">Reply Length</Label>
                <Select value={styles.length} onValueChange={(value) => setStyles({...styles, length: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (50-80 characters)</SelectItem>
                    <SelectItem value="medium">Medium (80-150 characters)</SelectItem>
                    <SelectItem value="long">Long (150-280 characters)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="engagement">Engagement Level</Label>
                <Select value={styles.engagement_level} onValueChange={(value) => setStyles({...styles, engagement_level: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Observational)</SelectItem>
                    <SelectItem value="medium">Medium (Interactive)</SelectItem>
                    <SelectItem value="high">High (Highly Engaging)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topics Management */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black">Topics & Interests</CardTitle>
            <CardDescription>
              Specify topics you're interested in and ones to avoid
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Interested Topics */}
            <div className="space-y-3">
              <Label>Topics of Interest</Label>
              <div className="flex space-x-2">
                <Input 
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="e.g., AI, startups, marketing"
                  onKeyPress={(e) => e.key === 'Enter' && addTopic()}
                />
                <Button onClick={addTopic} variant="outline" className="border-gray-200">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {styles.topics_of_interest.map((topic) => (
                  <Badge 
                    key={topic} 
                    variant="outline" 
                    className="cursor-pointer border-green-200 text-green-700 hover:bg-green-50"
                    onClick={() => removeTopic(topic)}
                  >
                    {topic} ×
                  </Badge>
                ))}
              </div>
            </div>

            {/* Topics to Avoid */}
            <div className="space-y-3">
              <Label>Topics to Avoid</Label>
              <div className="flex space-x-2">
                <Input 
                  value={newAvoidTopic}
                  onChange={(e) => setNewAvoidTopic(e.target.value)}
                  placeholder="e.g., politics, religion"
                  onKeyPress={(e) => e.key === 'Enter' && addAvoidTopic()}
                />
                <Button onClick={addAvoidTopic} variant="outline" className="border-gray-200">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {styles.avoid_topics.map((topic) => (
                  <Badge 
                    key={topic} 
                    variant="outline" 
                    className="cursor-pointer border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => removeAvoidTopic(topic)}
                  >
                    {topic} ×
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Instructions */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <Sparkles className="h-5 w-5 mr-2" />
              Custom Instructions
            </CardTitle>
            <CardDescription>
              Add specific instructions to further customize your reply style
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={styles.custom_instructions}
              onChange={(e) => setStyles({...styles, custom_instructions: e.target.value})}
              placeholder="e.g., Always include a question to encourage engagement, Use emojis sparingly, Focus on actionable insights..."
              rows={4}
              className="border-gray-200 focus:border-black"
            />
          </CardContent>
        </Card>

        {/* Example Replies */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black">Example Replies</CardTitle>
            <CardDescription>
              Preview how your style settings will affect different types of replies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Positive Tweet Response</Label>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                {styles.examples.positive_reply}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Neutral Tweet Response</Label>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                {styles.examples.neutral_reply}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Challenging Tweet Response</Label>
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm">
                {styles.examples.negative_reply}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-black flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Test Your Reply Style
              </CardTitle>
              <CardDescription>
                Test how your AI will reply to different types of content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-content">Content to Reply To</Label>
                <Textarea
                  id="test-content"
                  value={testContent}
                  onChange={(e) => setTestContent(e.target.value)}
                  placeholder="Paste a tweet, post, or comment here to see how your AI would reply..."
                  rows={4}
                  className="border-gray-200 focus:border-black"
                />
              </div>
              
              <Button
                onClick={generateTestReply}
                disabled={generatingReply || !testContent.trim()}
                className="bg-black text-white hover:bg-gray-800"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generatingReply ? 'Generating...' : 'Generate Test Reply'}
              </Button>
              
              {testReply && (
                <div className="space-y-4">
                  <Label>Generated Reply</Label>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 font-medium">{testReply}</p>
                  </div>
                  
                  {testReplyData && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Strategy:</span>
                          <Badge variant="outline">{testReplyData.strategy}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Viral Score:</span>
                          <Badge variant="outline" className="border-green-200 text-green-700">
                            {Math.round(testReplyData.viralScore * 100)}%
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Confidence:</span>
                          <Badge variant="outline" className="border-purple-200 text-purple-700">
                            {Math.round(testReplyData.confidence * 100)}%
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-gray-600 text-xs">Optimized For:</div>
                        <div className="text-gray-800 text-xs">{testReplyData.optimizedFor}</div>
                        
                        {testReplyData.psychology?.triggers && (
                          <div>
                            <div className="text-gray-600 text-xs mb-1">Psychology Triggers:</div>
                            <div className="flex flex-wrap gap-1">
                              {testReplyData.psychology.triggers.slice(0, 3).map((trigger: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs border-orange-200 text-orange-700">
                                  {trigger}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {testReplyData?.reasoning && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
                      <strong>AI Reasoning:</strong> {testReplyData.reasoning}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-analysis" className="space-y-6">
          <Card className="border-blue-100 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Analyze Your Writing Style
              </CardTitle>
              <CardDescription className="text-blue-700">
                Train the AI to reply using YOUR unique voice by analyzing your own tweets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-blue-700">
                <strong>Why this matters:</strong> The AI will generate much better replies when it knows your personal writing style, tone, and typical engagement patterns.
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Manual Input */}
            <Card className="border-gray-100">
              <CardHeader>
                <CardTitle className="text-black flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Paste Your Tweets
                </CardTitle>
                <CardDescription>
                  Copy and paste 5-10 of your recent tweets (one per line)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="my-tweets">Your Recent Tweets</Label>
                  <Textarea
                    id="my-tweets"
                    value={myTweets}
                    onChange={(e) => setMyTweets(e.target.value)}
                    placeholder="Paste your tweets here, one per line...

Example:
Just shipped a major update to our app! The user feedback has been incredible 🚀
Building in public has taught me more than any course could
Hot take: consistency beats perfection every single time
Been working on this feature for weeks. Finally ready to launch!"
                    rows={8}
                    className="border-gray-200 focus:border-black font-mono text-sm"
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {myTweets.split('\n').filter(line => line.trim()).length} tweets ready
                  </div>
                  <Button
                    onClick={analyzeMyTweets}
                    disabled={analyzingPersonal || !myTweets.trim()}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {analyzingPersonal ? 'Analyzing...' : 'Analyze My Style'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* API Fetch */}
            <Card className="border-gray-100">
              <CardHeader>
                <CardTitle className="text-black flex items-center">
                  <Download className="h-5 w-5 mr-2" />
                  Fetch from X
                </CardTitle>
                <CardDescription>
                  Enter your X username to automatically fetch and analyze your tweets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="my-username">Your X Username</Label>
                  <Input
                    id="my-username"
                    value={myUsername}
                    onChange={(e) => setMyUsername(e.target.value)}
                    placeholder="@yourusername"
                    className="border-gray-200 focus:border-black"
                  />
                </div>
                
                <Button
                  onClick={fetchMyTweets}
                  disabled={fetchingTweets || analyzingPersonal || !myUsername.trim()}
                  className="bg-blue-600 text-white hover:bg-blue-700 w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {fetchingTweets ? 'Fetching...' : analyzingPersonal ? 'Analyzing...' : 'Fetch & Analyze'}
                </Button>
                
                <div className="text-sm text-gray-600">
                  <p>This will fetch your 20 most recent tweets and analyze your writing patterns automatically.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Results */}
          {personalAnalysis && (
            <Card className="border-green-100 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Your Personal Writing Style Analysis
                </CardTitle>
                <CardDescription className="text-green-700">
                  AI has analyzed your tweets and will now use this to generate replies in YOUR voice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-green-700">Your Tone:</span>
                      <Badge className="bg-green-200 text-green-800">{personalAnalysis.writingStyle?.tone}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Your Personality:</span>
                      <Badge className="bg-green-200 text-green-800">{personalAnalysis.writingStyle?.personality}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Confidence:</span>
                      <Badge className="bg-green-200 text-green-800">{Math.round(personalAnalysis.confidence * 100)}%</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-green-700 text-sm">Your Topics:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {personalAnalysis.contentPatterns?.commonTopics?.slice(0, 4).map((topic: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs border-green-300 text-green-700">{topic}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-green-700 text-sm">Your Engagement Style:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {personalAnalysis.contentPatterns?.engagementTriggers?.slice(0, 3).map((trigger: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs border-green-300 text-green-700">{trigger}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-white rounded border border-green-200">
                  <div className="text-sm text-green-800">
                    <strong>✅ Personal Style Active:</strong> The AI will now generate replies that match your tone ({personalAnalysis.writingStyle?.tone}), personality ({personalAnalysis.writingStyle?.personality}), and typical engagement patterns.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analyze" className="space-y-6">
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-black flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Analyze Target User Style
              </CardTitle>
              <CardDescription>
                Analyze a target user's posting style and adapt your AI to reply like them
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target-username">Target Username</Label>
                <div className="flex space-x-2">
                  <Input
                    id="target-username"
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                    placeholder="@username"
                    className="border-gray-200 focus:border-black"
                  />
                  <Button
                    onClick={analyzeTargetUser}
                    disabled={analyzingTarget || !targetUsername.trim()}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    {analyzingTarget ? 'Analyzing...' : 'Analyze'}
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>This will analyze the target user's recent posts to understand their:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Writing tone and personality</li>
                  <li>Common topics and interests</li>
                  <li>Engagement patterns</li>
                  <li>Viral content strategies</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="viral" className="space-y-6">
          <ViralContentInterview />
        </TabsContent>
      </Tabs>
    </div>
  )
}