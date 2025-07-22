import { NextRequest } from 'next/server'
import { GET, PUT } from '@/app/api/auth/user/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}))

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockPrisma = prisma as any

describe('/api/auth/user', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/auth/user', () => {
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

    it('should return user data successfully with all relations', async () => {
      const mockUser = {
        id: 'user-1',
        clerkId: 'clerk-user-id',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: 'pro',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        xAccounts: [
          {
            id: 'account-1',
            username: 'testuser',
            isActive: true,
          },
        ],
        subscription: {
          id: 'sub-1',
          planName: 'pro',
          status: 'active',
        },
        _count: {
          targetUsers: 5,
          replyQueue: 12,
          templates: 3,
        },
      }

      mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockUser)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'clerk-user-id' },
        include: {
          xAccounts: true,
          subscription: true,
          _count: {
            select: {
              targetUsers: true,
              replyQueue: true,
              templates: true,
            },
          },
        },
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

  describe('PUT /api/auth/user', () => {
    const validUpdateData = {
      name: 'Updated Name',
    }

    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const request = new NextRequest('http://localhost:3000/api/auth/user', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should update user successfully', async () => {
      const mockUpdatedUser = {
        id: 'user-1',
        clerkId: 'clerk-user-id',
        email: 'test@example.com',
        name: 'Updated Name',
        subscriptionTier: 'free',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      }

      mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser)

      const request = new NextRequest('http://localhost:3000/api/auth/user', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockUpdatedUser)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { clerkId: 'clerk-user-id' },
        data: { name: 'Updated Name' },
      })
    })

    it('should handle missing request body gracefully', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })

      const request = new NextRequest('http://localhost:3000/api/auth/user', {
        method: 'PUT',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request)

      // Should still attempt to update with undefined name
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { clerkId: 'clerk-user-id' },
        data: { name: undefined },
      })
    })

    it('should handle database errors during update', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })
      mockPrisma.user.update.mockRejectedValue(new Error('User not found'))

      const request = new NextRequest('http://localhost:3000/api/auth/user', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle malformed JSON gracefully', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk-user-id' })

      const request = new NextRequest('http://localhost:3000/api/auth/user', {
        method: 'PUT',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})