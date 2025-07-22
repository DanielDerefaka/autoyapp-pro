import { TextEncoder, TextDecoder } from 'util'

// Polyfill for TextEncoder/TextDecoder
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

// Mock Clerk for Node.js environment
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}))

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    targetUser: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    xAccount: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    replyQueue: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    tweet: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

// Mock OpenAI
jest.mock('openai')

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_test'
process.env.CLERK_SECRET_KEY = 'sk_test_test'

// Silence console logs during tests unless there are errors
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.log = jest.fn()
  console.warn = (...args) => {
    // Only log warnings that aren't test-related
    if (!args.some(arg => 
      typeof arg === 'string' && 
      (arg.includes('test') || arg.includes('jest') || arg.includes('mock'))
    )) {
      originalConsoleWarn.call(console, ...args)
    }
  }
})

afterAll(() => {
  console.log = originalConsoleLog
  console.warn = originalConsoleWarn
})