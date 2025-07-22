import { NextRequest } from 'next/server'
import { POST } from '@/app/api/replies/generate/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}))

jest.mock('openai')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockPrisma = prisma as any
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>

describe('/api/replies/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const validRequestData = {
    tweetId: 'tweet-123',
    tweetContent: 'Just launched my new startup! Excited to see where this journey takes us.',
    targetUsername: 'entrepreneur',
    context: {
      authorUsername: 'testuser',
      sentiment: 0.8,
    },
  }

  it('should return 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const request = new NextRequest('http://localhost:3000/api/replies/generate', {
      method: 'POST',
      body: JSON.stringify(validRequestData),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 when required fields are missing', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })

    const invalidData = {
      tweetContent: 'Some content',
      // Missing tweetId
    }

    const request = new NextRequest('http://localhost:3000/api/replies/generate', {
      method: 'POST',
      body: JSON.stringify(invalidData),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
  })

  it('should return 404 when user not found in database', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/replies/generate', {
      method: 'POST',
      body: JSON.stringify(validRequestData),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User not found')
  })

  it('should generate reply successfully with default styles', async () => {
    const mockUser = { 
      id: 'user-1', 
      clerkId: 'clerk-user-id',
      replyStyle: null 
    }

    const mockOpenAIResponse = {
      choices: [{
        message: {
          content: 'This is exactly what the world needs right now! Your passion for solving real problems shows, and I can already see the impact this will have. What\'s been the biggest learning so far? 🚀'
        }
      }]
    }

    mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    
    const mockChatCompletion = jest.fn().mockResolvedValue(mockOpenAIResponse)
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockChatCompletion
        }
      }
    }) as any)

    const request = new NextRequest('http://localhost:3000/api/replies/generate', {
      method: 'POST',
      body: JSON.stringify(validRequestData),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reply).toBeTruthy()
    expect(data.tweetId).toBe('tweet-123')
    expect(data.generatedAt).toBeTruthy()
    expect(data.fallback).toBeUndefined()
  })

  it('should generate reply with custom user styles', async () => {
    const mockUser = { 
      id: 'user-1', 
      clerkId: 'clerk-user-id',
      replyStyle: {
        styles: JSON.stringify({
          tone: 'casual',
          personality: 'witty',
          length: 'short',
          engagement_level: 'high',
          topics_of_interest: ['startup', 'tech'],
          custom_instructions: 'Always include a question at the end'
        })
      }
    }

    const mockOpenAIResponse = {
      choices: [{
        message: {
          content: 'Congrats on the launch! The startup journey is wild - what\'s your biggest challenge right now?'
        }
      }]
    }

    mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    
    const mockChatCompletion = jest.fn().mockResolvedValue(mockOpenAIResponse)
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockChatCompletion
        }
      }
    }) as any)

    const request = new NextRequest('http://localhost:3000/api/replies/generate', {
      method: 'POST',
      body: JSON.stringify(validRequestData),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reply).toBeTruthy()
    expect(mockChatCompletion).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o-mini',
      max_tokens: 100,
      temperature: 0.9,
    }))
  })

  it('should handle ReplyStyle table not existing gracefully', async () => {
    const mockUser = { id: 'user-1', clerkId: 'clerk-user-id' }
    
    // First call with replyStyle include should fail
    mockPrisma.user.findUnique
      .mockRejectedValueOnce({ code: 'P2021', message: 'Table does not exist' })
      .mockResolvedValueOnce(mockUser) // Second call without include should succeed

    const mockOpenAIResponse = {
      choices: [{
        message: {
          content: 'Amazing news! Startup life is an adventure. What inspired this idea?'
        }
      }]
    }

    mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
    
    const mockChatCompletion = jest.fn().mockResolvedValue(mockOpenAIResponse)
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockChatCompletion
        }
      }
    }) as any)

    const request = new NextRequest('http://localhost:3000/api/replies/generate', {
      method: 'POST',
      body: JSON.stringify(validRequestData),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reply).toBeTruthy()
    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2)
  })

  it('should return fallback reply when OpenAI fails', async () => {
    const mockUser = { 
      id: 'user-1', 
      clerkId: 'clerk-user-id',
      replyStyle: null 
    }

    mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    
    const mockChatCompletion = jest.fn().mockRejectedValue(new Error('OpenAI API error'))
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockChatCompletion
        }
      }
    }) as any)

    const request = new NextRequest('http://localhost:3000/api/replies/generate', {
      method: 'POST',
      body: JSON.stringify(validRequestData),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reply).toBeTruthy()
    expect(data.tweetId).toBe('tweet-123')
    expect(data.fallback).toBe(true)
    expect(data.generatedAt).toBeTruthy()
  })

  it('should handle malformed JSON in user styles gracefully', async () => {
    const mockUser = { 
      id: 'user-1', 
      clerkId: 'clerk-user-id',
      replyStyle: {
        styles: 'invalid json'
      }
    }

    const mockOpenAIResponse = {
      choices: [{
        message: {
          content: 'Exciting launch! What problem are you solving?'
        }
      }]
    }

    mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    
    const mockChatCompletion = jest.fn().mockResolvedValue(mockOpenAIResponse)
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockChatCompletion
        }
      }
    }) as any)

    const request = new NextRequest('http://localhost:3000/api/replies/generate', {
      method: 'POST',
      body: JSON.stringify(validRequestData),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reply).toBeTruthy()
    // Should use default styles when JSON parsing fails
  })

  it('should clean up reply by removing quotes and @ mentions', async () => {
    const mockUser = { 
      id: 'user-1', 
      clerkId: 'clerk-user-id',
      replyStyle: null 
    }

    const mockOpenAIResponse = {
      choices: [{
        message: {
          content: '"@testuser This is amazing! What inspired you to start this?" '
        }
      }]
    }

    mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    
    const mockChatCompletion = jest.fn().mockResolvedValue(mockOpenAIResponse)
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockChatCompletion
        }
      }
    }) as any)

    const request = new NextRequest('http://localhost:3000/api/replies/generate', {
      method: 'POST',
      body: JSON.stringify(validRequestData),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reply).toBe('This is amazing! What inspired you to start this?')
    expect(data.reply).not.toContain('@testuser')
    expect(data.reply).not.toContain('"')
  })

  it('should handle empty OpenAI response', async () => {
    const mockUser = { 
      id: 'user-1', 
      clerkId: 'clerk-user-id',
      replyStyle: null 
    }

    const mockOpenAIResponse = {
      choices: [{
        message: {
          content: ''
        }
      }]
    }

    mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    
    const mockChatCompletion = jest.fn().mockResolvedValue(mockOpenAIResponse)
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockChatCompletion
        }
      }
    }) as any)

    const request = new NextRequest('http://localhost:3000/api/replies/generate', {
      method: 'POST',
      body: JSON.stringify(validRequestData),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.fallback).toBe(true) // Should fall back to simple reply
    expect(data.reply).toBeTruthy()
  })
})