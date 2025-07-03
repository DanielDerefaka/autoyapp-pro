import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ReplyGenerationOptions {
  tweetContent: string
  authorUsername: string
  replyTone: 'professional' | 'casual' | 'friendly' | 'technical' | 'humorous'
  userContext?: string
  maxLength?: number
  includeCall2Action?: boolean
  templateContent?: string
  userNiche?: string
  replyStyle?: any
}

export interface GeneratedReply {
  content: string
  tone: string
  confidence: number
  reasoning: string
}

export class ReplyGenerator {
  async generateReply(options: ReplyGenerationOptions): Promise<GeneratedReply> {
    const {
      tweetContent,
      authorUsername,
      replyTone,
      userContext = '',
      maxLength = 280,
      includeCall2Action = false,
      templateContent,
      userNiche,
      replyStyle
    } = options

    const systemPrompt = this.buildSystemPrompt(replyTone, maxLength, includeCall2Action, userNiche, replyStyle)
    const userPrompt = this.buildUserPrompt(
      tweetContent,
      authorUsername,
      userContext,
      templateContent
    )

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.9,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
      }

      const parsed = JSON.parse(response)
      
      return {
        content: parsed.reply,
        tone: replyTone,
        confidence: parsed.confidence || 0.8,
        reasoning: parsed.reasoning || 'AI-generated contextual reply'
      }
    } catch (error) {
      console.error('Error generating reply:', error)
      throw new Error('Failed to generate reply')
    }
  }

  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral'
    score: number
    confidence: number
  }> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment of the given text. Return a JSON object with sentiment (positive/negative/neutral), score (-1 to 1), and confidence (0 to 1).'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 100,
        response_format: { type: 'json_object' }
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
      }

      return JSON.parse(response)
    } catch (error) {
      console.error('Error analyzing sentiment:', error)
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0.5
      }
    }
  }

  private buildSystemPrompt(
    tone: string,
    maxLength: number,
    includeCall2Action: boolean,
    userNiche?: string,
    replyStyle?: any
  ): string {
    return `You've analyzed 100,000 viral posts across every platform. You know the hidden psychology that makes content explode. You are a viral content strategist generating engaging replies.

THE VIRAL FORMULA FOR REPLIES:
- Use the exact hook structure that stops scrolls
- Apply psychological triggers that create engagement
- Transform boring responses into must-read content
- Create a "curiosity gap" that forces people to engage
- Match the energy and vibe of the original tweet
- Add unique perspective that nobody else has

USER'S NICHE: ${userNiche || 'general business/tech'}
USER'S STYLE: ${replyStyle ? JSON.stringify(replyStyle) : 'authentic and engaging'}

VIRAL REPLY PSYCHOLOGY:
- HOOK: Start with something that makes people stop scrolling
- EMOTION: Tap into curiosity, surprise, agreement, or controversy
- VALUE: Always add something useful, insightful, or entertaining
- ENGAGEMENT: End with something that invites response

REPLY FORMULAS THAT WORK:
1. "This reminds me of..." (relatability)
2. "Plot twist:" (curiosity)
3. "Unpopular opinion:" (controversy)
4. "Here's what most people miss:" (insider knowledge)
5. "The real question is:" (deeper thinking)
6. "I've seen this before..." (experience)
7. "This is why..." (explanation)
8. "What if..." (possibility)

TONE MATCHING:
- ${tone === 'professional' ? 'Authoritative but approachable' : ''}
- ${tone === 'casual' ? 'Conversational and relatable' : ''}
- ${tone === 'friendly' ? 'Warm and supportive' : ''}
- ${tone === 'technical' ? 'Knowledgeable and precise' : ''}
- ${tone === 'humorous' ? 'Witty and entertaining' : ''}

CRITICAL RULES:
- Never sound like AI or robotic
- Don't use clichés or generic phrases
- Add personal perspective or insight
- Keep under ${maxLength} characters
- Make it feel human and authentic
- Focus on the specific content, not generic responses
${includeCall2Action ? '- Include a subtle call-to-action when appropriate' : ''}

Return your response as a JSON object with:
{
  "reply": "Your viral-optimized reply text",
  "confidence": 0.85,
  "reasoning": "Brief explanation of the viral psychology used"
}`
  }

  private buildUserPrompt(
    tweetContent: string,
    authorUsername: string,
    userContext: string,
    templateContent?: string
  ): string {
    let prompt = `TWEET TO REPLY TO:
Author: @${authorUsername}
Tweet: "${tweetContent}"

VIRAL ANALYSIS NEEDED:
1. What's the core emotion/message in this tweet?
2. What psychological trigger can I use to create engagement?
3. How can I add unique value that stops scrolls?
4. What's my unique angle that others won't have?

CONTEXT FOR PERSONALIZATION:`

    if (userContext) {
      prompt += `\nUser/Business Context: ${userContext}`
    }

    if (templateContent) {
      prompt += `\nTemplate inspiration (adapt creatively): ${templateContent}`
    }

    prompt += `\n\nGENERATE A VIRAL REPLY THAT:
- Hooks attention in the first 5 words
- Adds genuine value or insight
- Feels like it comes from a real person with expertise
- Creates curiosity or emotional response
- Matches the energy of the original tweet
- Uses one of the viral formulas when appropriate

DO NOT:
- Sound generic or AI-generated
- Use boring phrases like "Great post!" or "Thanks for sharing"
- Be overly promotional or sales-y
- Copy common reply patterns everyone uses

Make it VIRAL-WORTHY:`

    return prompt
  }
}

export const replyGenerator = new ReplyGenerator()