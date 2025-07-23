'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { 
  User, 
  Upload, 
  Download, 
  Brain, 
  BarChart3, 
  MessageSquare, 
  TrendingUp,
  FileText,
  Sparkles,
  Clock,
  Heart,
  Repeat2,
  MessageCircle
} from 'lucide-react'

interface UserTweet {
  id: string
  content: string
  timestamp: string
  likes: number
  retweets: number
  replies: number
}

interface UserAnalysis {
  writingStyle: {
    tone: string
    personality: string
    formality: string
  }
  contentPatterns: {
    commonTopics: string[]
    contentTypes: string[]
    engagementTriggers: string[]
  }
  languageCharacteristics: {
    vocabularyLevel: string
    avgLength: number
    uniquePhrases: string[]
  }
  viralElements: {
    engagementFactors: string[]
    psychologicalTriggers: string[]
    storytellingPatterns: string[]
  }
  aiTrainingInsights: {
    keyCharacteristics: string[]
    voiceConsistency: string
    contentFormulas: string[]
    optimizationTechniques: string[]
  }
  totalTweets: number
  confidence: number
}

export default function UserFeedPage() {
  const [activeTab, setActiveTab] = useState('manual')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  
  // Manual input state
  const [manualTweets, setManualTweets] = useState('')
  
  // API fetch state
  const [username, setUsername] = useState('')
  const [fetchCount, setFetchCount] = useState(20)
  
  // Data state
  const [tweets, setTweets] = useState<UserTweet[]>([])
  const [analysis, setAnalysis] = useState<UserAnalysis | null>(null)
  const [analysisHistory, setAnalysisHistory] = useState([])

  useEffect(() => {
    loadAnalysisHistory()
  }, [])

  const loadAnalysisHistory = async () => {
    try {
      const response = await fetch('/api/user-feed/history')
      if (response.ok) {
        const data = await response.json()
        setAnalysisHistory(data.analyses || [])
      }
    } catch (error) {
      console.error('Failed to load analysis history:', error)
    }
  }

  const handleManualAnalysis = async () => {
    if (!manualTweets.trim()) {
      toast.error('Please enter some tweets to analyze')
      return
    }

    setAnalyzing(true)
    try {
      // Parse manual tweets (assuming each line is a tweet)
      const tweetLines = manualTweets
        .split('\n')
        .filter(line => line.trim())
        .map((content, index) => ({
          id: `manual_${index}`,
          content: content.trim(),
          timestamp: new Date().toISOString(),
          likes: 0,
          retweets: 0,
          replies: 0
        }))

      if (tweetLines.length === 0) {
        toast.error('No valid tweets found')
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
        setTweets(tweetLines)
        setAnalysis(data.analysis)
        toast.success(`Analyzed ${tweetLines.length} tweets successfully!`)
        loadAnalysisHistory() // Refresh history
      } else {
        toast.error(data.error || 'Failed to analyze tweets')
      }
    } catch (error) {
      toast.error('Failed to analyze tweets')
      console.error('Analysis error:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleApiFetch = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username')
      return
    }

    setLoading(true)
    try {
      // First fetch tweets
      const fetchResponse = await fetch('/api/user-feed/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.replace('@', ''),
          count: fetchCount
        })
      })

      const fetchData = await fetchResponse.json()
      
      if (!fetchResponse.ok) {
        toast.error(fetchData.error || 'Failed to fetch tweets')
        return
      }

      // Then analyze the fetched tweets
      setAnalyzing(true)
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
        setTweets(fetchData.tweets)
        setAnalysis(analyzeData.analysis)
        toast.success(`Fetched and analyzed ${fetchData.totalFetched} tweets from @${username}!`)
        loadAnalysisHistory() // Refresh history
      } else {
        toast.error(analyzeData.error || 'Failed to analyze tweets')
      }
    } catch (error) {
      toast.error('Failed to fetch and analyze tweets')
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
      setAnalyzing(false)
    }
  }

  const clearData = () => {
    setTweets([])
    setAnalysis(null)
    setManualTweets('')
    setUsername('')
    toast.info('Data cleared')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-black flex items-center">
            <User className="h-6 w-6 mr-2" />
            Your Content Analysis
          </h1>
          <p className="text-gray-500">
            Analyze your own tweets to train AI replies that match your unique voice and style
          </p>
        </div>
        <div className="flex space-x-3">
          {(tweets.length > 0 || analysis) && (
            <Button 
              variant="outline" 
              onClick={clearData}
              className="border-gray-200 text-black hover:bg-gray-50"
            >
              Clear Data
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="manual" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Manual Input
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Fetch from X
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center">
            <Brain className="h-4 w-4 mr-2" />
            AI Analysis
          </TabsTrigger>
        </TabsList>

        {/* Manual Input Tab */}
        <TabsContent value="manual" className="space-y-6">
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-black flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Paste Your Tweets
              </CardTitle>
              <CardDescription>
                Copy and paste your tweets (one per line) to analyze your writing style
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-tweets">Your Tweets</Label>
                <Textarea
                  id="manual-tweets"
                  value={manualTweets}
                  onChange={(e) => setManualTweets(e.target.value)}
                  placeholder="Paste your tweets here, one per line...

Example:
Just shipped a new feature that I've been working on for weeks. The user feedback has been incredible! 🚀
Building in public has taught me more about product development than any course ever could.
Hot take: Most startup advice is generic because it comes from people who haven't built anything recently."
                  rows={10}
                  className="border-gray-200 focus:border-black font-mono text-sm"
                />
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {manualTweets.split('\n').filter(line => line.trim()).length} tweets ready for analysis
                </div>
                <Button
                  onClick={handleManualAnalysis}
                  disabled={analyzing || !manualTweets.trim()}
                  className="bg-black text-white hover:bg-gray-800"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {analyzing ? 'Analyzing...' : 'Analyze Tweets'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Fetch Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-black flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Fetch Your Tweets
              </CardTitle>
              <CardDescription>
                Enter your X username to automatically fetch and analyze your recent tweets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Your Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="@yourusername"
                    className="border-gray-200 focus:border-black"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="count">Number of Tweets</Label>
                  <Input
                    id="count"
                    type="number"
                    value={fetchCount}
                    onChange={(e) => setFetchCount(parseInt(e.target.value) || 20)}
                    min="10"
                    max="100"
                    className="border-gray-200 focus:border-black"
                  />
                </div>
              </div>
              
              <Button
                onClick={handleApiFetch}
                disabled={loading || analyzing || !username.trim()}
                className="bg-black text-white hover:bg-gray-800 w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {loading ? 'Fetching...' : analyzing ? 'Analyzing...' : 'Fetch & Analyze Tweets'}
              </Button>
              
              <div className="text-sm text-gray-600">
                <p>This will:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Fetch your recent tweets using the same API used for target analysis</li>
                  <li>Store them securely in your account</li>
                  <li>Analyze your writing patterns and style</li>
                  <li>Create an AI training profile based on your voice</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Results Tab */}
        <TabsContent value="analysis" className="space-y-6">
          {analysis ? (
            <>
              {/* Analysis Overview */}
              <Card className="border-green-100 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Your Writing Style Analysis
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    AI-powered analysis of {analysis.totalTweets} tweets with {Math.round(analysis.confidence * 100)}% confidence
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-800">{analysis.totalTweets}</div>
                      <div className="text-sm text-green-600">Tweets Analyzed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-800">{analysis.writingStyle.tone}</div>
                      <div className="text-sm text-green-600">Primary Tone</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-800">{Math.round(analysis.confidence * 100)}%</div>
                      <div className="text-sm text-green-600">Confidence</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Analysis */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Writing Style */}
                <Card className="border-gray-100">
                  <CardHeader>
                    <CardTitle className="text-black">Writing Style</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tone:</span>
                      <Badge variant="outline">{analysis.writingStyle.tone}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Personality:</span>
                      <Badge variant="outline">{analysis.writingStyle.personality}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Formality:</span>
                      <Badge variant="outline">{analysis.writingStyle.formality}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Content Patterns */}
                <Card className="border-gray-100">
                  <CardHeader>
                    <CardTitle className="text-black">Content Patterns</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-gray-600 text-sm">Common Topics:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.contentPatterns.commonTopics.map((topic, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{topic}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Content Types:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.contentPatterns.contentTypes.map((type, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{type}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Viral Elements */}
                <Card className="border-gray-100">
                  <CardHeader>
                    <CardTitle className="text-black">Viral Elements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-gray-600 text-sm">Engagement Factors:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.viralElements.engagementFactors.map((factor, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-purple-200 text-purple-700">{factor}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Psychological Triggers:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.viralElements.psychologicalTriggers.map((trigger, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-purple-200 text-purple-700">{trigger}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Training Insights */}
                <Card className="border-gray-100">
                  <CardHeader>
                    <CardTitle className="text-black">AI Training Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-gray-600 text-sm">Key Characteristics:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.aiTrainingInsights.keyCharacteristics.map((char, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-blue-200 text-blue-700">{char}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Voice Consistency:</span>
                      <Badge variant="outline" className="border-blue-200 text-blue-700">
                        {analysis.aiTrainingInsights.voiceConsistency}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sample Tweets */}
              {tweets.length > 0 && (
                <Card className="border-gray-100">
                  <CardHeader>
                    <CardTitle className="text-black">Sample Tweets Analyzed</CardTitle>
                    <CardDescription>
                      Recent tweets used for this analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {tweets.slice(0, 5).map((tweet, index) => (
                        <div key={tweet.id} className="p-3 border border-gray-200 rounded-lg">
                          <p className="text-sm text-gray-800 mb-2">{tweet.content}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(tweet.timestamp).toLocaleDateString()}
                            </span>
                            <span className="flex items-center">
                              <Heart className="h-3 w-3 mr-1" />
                              {tweet.likes}
                            </span>
                            <span className="flex items-center">
                              <Repeat2 className="h-3 w-3 mr-1" />
                              {tweet.retweets}
                            </span>
                            <span className="flex items-center">
                              <MessageCircle className="h-3 w-3 mr-1" />
                              {tweet.replies}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="border-gray-100">
              <CardContent className="text-center py-12">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Yet</h3>
                <p className="text-gray-500 mb-4">
                  Use the "Manual Input" or "Fetch from X" tabs to analyze your tweets
                </p>
                <div className="flex justify-center space-x-4">
                  <Button onClick={() => setActiveTab('manual')} variant="outline">
                    Paste Tweets
                  </Button>
                  <Button onClick={() => setActiveTab('api')} variant="outline">
                    Fetch from X
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}