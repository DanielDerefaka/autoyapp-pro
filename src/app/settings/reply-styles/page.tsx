'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Bot, Save, RotateCcw, Sparkles } from 'lucide-react'

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
          <h1 className="text-2xl font-bold text-black">Reply Styles</h1>
          <p className="text-gray-500">
            Customize how AI generates replies to match your voice and style
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
    </div>
  )
}