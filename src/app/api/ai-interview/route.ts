import { NextResponse } from 'next/server'
import { ViralStylesManager } from '@/lib/viral-styles'

interface InterviewQuestion {
  id: number
  question: string
  followUp?: string
  analysis?: string
}

const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 1,
    question: "Share your last 5 posts that flopped",
    followUp: "What do you think made them fail to connect with your audience?",
    analysis: "analyzing failed content patterns"
  },
  {
    id: 2,
    question: "What's one topic you're passionate about but gets no engagement?",
    followUp: "Why do you think this topic doesn't resonate with your current audience?",
    analysis: "identifying passion-engagement gaps"
  },
  {
    id: 3,
    question: "Show me your best performing content ever",
    followUp: "What elements made this content successful compared to your usual posts?",
    analysis: "reverse engineering viral success"
  },
  {
    id: 4,
    question: "What do you post when you have nothing to say?",
    followUp: "How do these 'filler' posts usually perform compared to your planned content?",
    analysis: "understanding content desperation patterns"
  },
  {
    id: 5,
    question: "What content do you consume but never create?",
    followUp: "What stops you from creating this type of content yourself?",
    analysis: "identifying untapped content opportunities"
  }
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const questionId = parseInt(searchParams.get('question') || '1')
  
  const question = INTERVIEW_QUESTIONS.find(q => q.id === questionId)
  
  if (!question) {
    return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 })
  }
  
  return NextResponse.json({
    question,
    totalQuestions: INTERVIEW_QUESTIONS.length,
    currentQuestion: questionId
  })
}

export async function POST(request: Request) {
  try {
    const { questionId, answer, action } = await request.json()
    
    if (action === 'analyze') {
      return await analyzeAnswer(questionId, answer)
    } else if (action === 'generate_content') {
      return await generateViralContent(answer)
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error processing interview response:', error)
    return NextResponse.json({ error: 'Failed to process response' }, { status: 500 })
  }
}

async function analyzeAnswer(questionId: number, answer: string) {
  const question = INTERVIEW_QUESTIONS.find(q => q.id === questionId)
  
  if (!question) {
    return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 })
  }
  
  // Generate analysis based on the question type
  let analysis = ""
  let viralTips = []
  let psychologicalTriggers = []
  let contentSuggestions = []
  
  switch (questionId) {
    case 1: // Failed posts
      analysis = `I've analyzed your failed posts. The main patterns I see are: lack of emotional hooks, generic messaging, and missing curiosity gaps. Your content needs more psychological precision.`
      viralTips = [
        "Add emotional hooks in the first 7 words",
        "Create information gaps that demand completion",
        "Use pattern interrupts to stop scrolling"
      ]
      psychologicalTriggers = ["curiosity", "surprise", "controversy", "social-proof"]
      contentSuggestions = await generateContentIdeas(answer, "failed_analysis")
      break
      
    case 2: // Passion without engagement
      analysis = `Your passion topic isn't connecting because you're speaking about what YOU love, not what your AUDIENCE needs. Let's bridge that gap.`
      viralTips = [
        "Frame your passion through audience problems",
        "Use \"you\" more than \"I\" in your posts",
        "Connect passionate topics to trending conversations"
      ]
      psychologicalTriggers = ["relatability", "value", "insider-knowledge"]
      contentSuggestions = await generateContentIdeas(answer, "passion_bridge")
      break
      
    case 3: // Best performing content
      analysis = `Your successful content works because it hits specific psychological triggers. Let's reverse-engineer this formula and apply it systematically.`
      viralTips = [
        "Identify the exact emotional peak in your best content",
        "Replicate the structure, not just the topic",
        "Scale the psychological triggers that worked"
      ]
      psychologicalTriggers = ["proven-success", "pattern-recognition", "scalability"]
      contentSuggestions = await generateContentIdeas(answer, "success_replication")
      break
      
    case 4: // Filler content
      analysis = `Your 'nothing to say' posts reveal your authentic voice. These unfiltered moments often contain viral gold that structured posts miss.`
      viralTips = [
        "Turn random thoughts into thought leadership",
        "Use vulnerability as a viral multiplier",
        "Transform observations into insights"
      ]
      psychologicalTriggers = ["authenticity", "vulnerability", "relatability"]
      contentSuggestions = await generateContentIdeas(answer, "authentic_transformation")
      break
      
    case 5: // Content you consume but don't create
      analysis = `This content gap is your biggest opportunity. You already know what works - now let's adapt it to your unique voice and expertise.`
      viralTips = [
        "Adapt successful formats to your niche",
        "Add your unique perspective to popular content types",
        "Fill the content gap with your expertise"
      ]
      psychologicalTriggers = ["opportunity", "adaptation", "uniqueness"]
      contentSuggestions = await generateContentIdeas(answer, "gap_filling")
      break
  }
  
  return NextResponse.json({
    analysis,
    viralTips,
    psychologicalTriggers,
    contentSuggestions,
    nextSteps: questionId < 5 ? `Ready for question ${questionId + 1}?` : "Ready to generate your 30-day viral content calendar?"
  })
}

async function generateContentIdeas(context: string, analysisType: string): Promise<string[]> {
  // This would typically use OpenAI, but for now return structured suggestions
  const baseIdeas = [
    "Transform this into a contrarian take",
    "Create a step-by-step framework",
    "Share a personal story with this lesson",
    "Ask a provocative question about this topic",
    "List common mistakes people make here"
  ]
  
  return baseIdeas.map(idea => `${idea} - ${context.substring(0, 50)}...`)
}

async function generateViralContent(allAnswers: any) {
  // This would generate the 30-day content calendar based on all interview answers
  return NextResponse.json({
    contentCalendar: "30-day viral content calendar would be generated here",
    viralFormula: "Custom viral formula based on user's specific answers",
    hooks: "Personalized hook templates",
    postingStrategy: "Optimized posting times and frequency"
  })
}