import { TextEncoder, TextDecoder } from 'util'

// Polyfills
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

// Environment variables for testing
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.CLERK_SECRET_KEY = 'sk_test_test'