import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/targets/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    targetUser: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    xAccount: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}))

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockPrisma = prisma as any

describe('/api/targets', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/targets', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when user not found in database', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return target users successfully', async () => {
      const mockUser = { id: 'user-1', clerkId: 'clerk-user-id' }
      const mockTargets = [
        {
          id: 'target-1',
          targetUsername: 'testuser',
          userId: 'user-1',
          xAccountId: 'account-1',
          xAccount: { username: 'myaccount' },
          _count: { tweets: 5, analytics: 3 },
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ]

      mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.targetUser.findMany.mockResolvedValue(mockTargets)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockTargets)
      expect(mockPrisma.targetUser.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: {
          xAccount: {
            select: { username: true },
          },
          _count: {
            select: {
              tweets: true,
              analytics: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/targets', () => {
    const validTargetData = {
      targetUsername: 'newuser',
      xAccountId: 'cjld2cjxh0000qzrmn831i7rn',
      notes: 'Test notes',
    }

    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const request = new NextRequest('http://localhost:3000/api/targets', {
        method: 'POST',
        body: JSON.stringify(validTargetData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when user not found in database', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/targets', {
        method: 'POST',
        body: JSON.stringify(validTargetData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 400 for invalid data', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' })

      const invalidData = {
        targetUsername: '', // Invalid - empty
        xAccountId: 'invalid-cuid',
      }

      const request = new NextRequest('http://localhost:3000/api/targets', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid data')
      expect(data.details).toBeDefined()
    })

    it('should return 404 when X account not found or not owned by user', async () => {
      const mockUser = { id: 'user-1', clerkId: 'clerk-user-id' }

      mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.xAccount.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/targets', {
        method: 'POST',
        body: JSON.stringify(validTargetData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('X account not found or not owned by user')
    })

    it('should return 400 when target already exists', async () => {
      const mockUser = { id: 'user-1', clerkId: 'clerk-user-id' }
      const mockXAccount = { id: 'account-1', userId: 'user-1' }
      const mockExistingTarget = { id: 'existing-target' }

      mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.xAccount.findFirst.mockResolvedValue(mockXAccount)
      mockPrisma.targetUser.findUnique.mockResolvedValue(mockExistingTarget)

      const request = new NextRequest('http://localhost:3000/api/targets', {
        method: 'POST',
        body: JSON.stringify(validTargetData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Target user already exists')
    })

    it('should create target successfully', async () => {
      const mockUser = { id: 'user-1', clerkId: 'clerk-user-id' }
      const mockXAccount = { id: 'account-1', userId: 'user-1' }
      const mockCreatedTarget = {
        id: 'new-target',
        ...validTargetData,
        userId: 'user-1',
        xAccount: { username: 'myaccount' },
      }

      mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.xAccount.findFirst.mockResolvedValue(mockXAccount)
      mockPrisma.targetUser.findUnique.mockResolvedValue(null) // No existing target
      mockPrisma.targetUser.create.mockResolvedValue(mockCreatedTarget)

      const request = new NextRequest('http://localhost:3000/api/targets', {
        method: 'POST',
        body: JSON.stringify(validTargetData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockCreatedTarget)
      expect(mockPrisma.targetUser.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          xAccountId: validTargetData.xAccountId,
          targetUsername: validTargetData.targetUsername,
          notes: validTargetData.notes,
        },
        include: {
          xAccount: {
            select: { username: true },
          },
        },
      })
    })

    it('should handle database errors during creation', async () => {
      const mockUser = { id: 'user-1', clerkId: 'clerk-user-id' }
      const mockXAccount = { id: 'account-1', userId: 'user-1' }

      mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.xAccount.findFirst.mockResolvedValue(mockXAccount)
      mockPrisma.targetUser.findUnique.mockResolvedValue(null)
      mockPrisma.targetUser.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/targets', {
        method: 'POST',
        body: JSON.stringify(validTargetData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})