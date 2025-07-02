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
      templateContent
    } = options

    const systemPrompt = this.buildSystemPrompt(replyTone, maxLength, includeCall2Action)
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
        temperature: 0.8,
        max_tokens: 150,
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
    includeCall2Action: boolean
  ): string {
    const toneInstructions = {
      professional: 'Use a professional, business-appropriate tone. Be respectful and informative.',
      casual: 'Use a casual, conversational tone. Be friendly and approachable.',
      friendly: 'Use a warm, friendly tone. Be supportive and encouraging.',
      technical: 'Use a technical, knowledgeable tone. Include relevant technical details.',
      humorous: 'Use light humor when appropriate. Keep it professional and tasteful.'
    }

    return `You are an AI assistant that generates contextual replies to tweets for business engagement purposes.

IMPORTANT GUIDELINES:
- Generate replies that are ${toneInstructions[tone as keyof typeof toneInstructions]}
- Keep replies under ${maxLength} characters
- Always be respectful and comply with platform guidelines
- Add value to the conversation
- Avoid controversial topics
- Don't make claims you can't verify
- Be authentic and helpful
${includeCall2Action ? '- Include a subtle call-to-action when appropriate' : ''}

COMPLIANCE REQUIREMENTS:
- Never spam or send repetitive content
- Respect rate limits and user preferences  
- Avoid aggressive marketing or sales language
- Follow Twitter's Terms of Service
- Don't engage in controversial or political discussions

Return your response as a JSON object with:
{
  "reply": "Your generated reply text",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this reply is appropriate"
}`
  }

  private buildUserPrompt(
    tweetContent: string,
    authorUsername: string,
    userContext: string,
    templateContent?: string
  ): string {
    let prompt = `Generate a contextual reply to this tweet:

Author: @${authorUsername}
Tweet: "${tweetContent}"`

    if (userContext) {
      prompt += `\n\nUser/Business Context: ${userContext}`
    }

    if (templateContent) {
      prompt += `\n\nTemplate to follow (adapt as needed): ${templateContent}`
    }

    prompt += `\n\nGenerate an engaging, helpful reply that adds value to the conversation.`

    return prompt
  }
}

export const replyGenerator = new ReplyGenerator()