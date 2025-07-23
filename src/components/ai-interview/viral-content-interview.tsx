'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Sparkles, Brain, TrendingUp, MessageCircle, ArrowRight, ArrowLeft } from 'lucide-react'

interface InterviewQuestion {
  id: number
  question: string
  followUp?: string
  analysis?: string
}

interface AnalysisResult {
  analysis: string
  viralTips: string[]
  psychologicalTriggers: string[]
  contentSuggestions: string[]
  nextSteps: string
}

export default function ViralContentInterview() {
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [question, setQuestion] = useState<InterviewQuestion | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const totalQuestions = 5

  const fetchQuestion = async (questionId: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ai-interview?question=${questionId}`)
      const data = await response.json()
      
      if (response.ok) {
        setQuestion(data.question)
      } else {
        toast.error('Failed to load question')
      }
    } catch (error) {
      toast.error('Failed to load question')
    } finally {
      setLoading(false)
    }
  }

  const analyzeAnswer = async () => {
    if (!currentAnswer.trim()) {
      toast.error('Please provide an answer before continuing')
      return
    }

    try {
      setIsAnalyzing(true)
      const response = await fetch('/api/ai-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion,
          answer: currentAnswer,
          action: 'analyze'
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setAnalysis(data)
        setAnswers(prev => ({ ...prev, [currentQuestion]: currentAnswer }))
        toast.success('Answer analyzed!')
      } else {
        toast.error('Failed to analyze answer')
      }
    } catch (error) {
      toast.error('Failed to analyze answer')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const nextQuestion = async () => {
    if (currentQuestion < totalQuestions) {
      const nextQ = currentQuestion + 1
      setCurrentQuestion(nextQ)
      setCurrentAnswer('')
      setAnalysis(null)
      await fetchQuestion(nextQ)
    } else {
      // Generate final content calendar
      generateContentCalendar()
    }
  }

  const previousQuestion = async () => {
    if (currentQuestion > 1) {
      const prevQ = currentQuestion - 1
      setCurrentQuestion(prevQ)
      setCurrentAnswer(answers[prevQ] || '')
      setAnalysis(null)
      await fetchQuestion(prevQ)
    }
  }

  const generateContentCalendar = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ai-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_content',
          answer: answers
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success('Viral content calendar generated!')
        // Handle the generated content calendar
      } else {
        toast.error('Failed to generate content calendar')
      }
    } catch (error) {
      toast.error('Failed to generate content calendar')
    } finally {
      setLoading(false)
    }
  }

  // Initialize first question
  React.useEffect(() => {
    fetchQuestion(1)
  }, [])

  if (loading && !question) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-black flex items-center">
            <Brain className="h-6 w-6 mr-2" />
            AI Viral Content Interview
          </h1>
          <p className="text-gray-500">
            Answer 5 questions to get your personalized viral content strategy
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 mb-2">
            Question {currentQuestion} of {totalQuestions}
          </div>
          <Progress value={(currentQuestion / totalQuestions) * 100} className="w-32" />
        </div>
      </div>

      {/* Current Question */}
      {question && (
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-black flex items-center">
              <MessageCircle className="h-5 w-5 mr-2" />
              Question {currentQuestion}
            </CardTitle>
            <CardDescription className="text-lg font-medium text-gray-700">
              {question.question}
            </CardDescription>
            {question.followUp && (
              <p className="text-sm text-gray-500 mt-2">
                {question.followUp}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Share your detailed answer here..."
              rows={6}
              className="border-gray-200 focus:border-black"
            />
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={previousQuestion}
                disabled={currentQuestion === 1}
                className="border-gray-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <Button
                onClick={analyzeAnswer}
                disabled={isAnalyzing || !currentAnswer.trim()}
                className="bg-black text-white hover:bg-gray-800"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isAnalyzing ? 'Analyzing...' : 'Analyze Answer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && (
        <Card className="border-green-100 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Viral Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-green-700">
              {analysis.analysis}
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-green-800 mb-2">Viral Tips</h4>
                <ul className="space-y-1 text-sm text-green-700">
                  {analysis.viralTips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-green-800 mb-2">Psychological Triggers</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.psychologicalTriggers.map((trigger, index) => (
                    <Badge key={index} variant="outline" className="border-green-200 text-green-700">
                      {trigger}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-green-800 mb-2">Content Suggestions</h4>
              <div className="space-y-1 text-sm text-green-700">
                {analysis.contentSuggestions.slice(0, 3).map((suggestion, index) => (
                  <div key={index} className="p-2 bg-white rounded border border-green-200">
                    {suggestion}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={nextQuestion}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {currentQuestion < totalQuestions ? 'Next Question' : 'Generate Content Calendar'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Summary */}
      <Card className="border-gray-100">
        <CardHeader>
          <CardTitle className="text-black text-sm">Progress Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((q) => (
              <div
                key={q}
                className={`h-8 rounded flex items-center justify-center text-sm font-medium ${
                  answers[q] 
                    ? 'bg-green-100 text-green-700' 
                    : q === currentQuestion 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                Q{q}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}