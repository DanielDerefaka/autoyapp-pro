import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createTargetSchema = z.object({
  targetUsername: z.string().min(1).max(15),
  xAccountId: z.string().cuid(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await auth()
    const clerkId = authResult?.userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse query parameters for pagination and filtering
    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100) // Max 100 items
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const isActive = url.searchParams.get('isActive')

    // Build where clause
    const whereClause: any = { userId: user.id }
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      whereClause.isActive = isActive === 'true'
    }

    // Get total count for pagination metadata
    const totalCount = await prisma.targetUser.count({ where: whereClause })

    const targets = await prisma.targetUser.findMany({
      where: whereClause,
      include: {
        xAccount: {
          select: {
            username: true,
          },
        },
        _count: {
          select: {
            tweets: true,
            analytics: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const hasMore = offset + limit < totalCount

    return NextResponse.json({
      data: targets,
      pagination: {
        limit,
        offset,
        totalCount,
        hasMore,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching targets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await auth()
    const clerkId = authResult?.userId

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    console.log('Request body:', body)
    
    const validatedData = createTargetSchema.parse(body)
    console.log('Validated data:', validatedData)

    // Check if X account belongs to user
    const xAccount = await prisma.xAccount.findFirst({
      where: {
        id: validatedData.xAccountId,
        userId: user.id,
      },
    })

    if (!xAccount) {
      return NextResponse.json(
        { error: 'X account not found or not owned by user' },
        { status: 404 }
      )
    }

    // Check if target already exists for this user
    const existingTarget = await prisma.targetUser.findUnique({
      where: {
        userId_targetUsername: {
          userId: user.id,
          targetUsername: validatedData.targetUsername,
        },
      },
    })

    if (existingTarget) {
      return NextResponse.json(
        { error: 'Target user already exists' },
        { status: 400 }
      )
    }

    console.log('Creating target user:', validatedData)
    const target = await prisma.targetUser.create({
      data: {
        userId: user.id,
        xAccountId: validatedData.xAccountId,
        targetUsername: validatedData.targetUsername,
        notes: validatedData.notes,
      },
      include: {
        xAccount: {
          select: {
            username: true,
          },
        },
      },
    })

    return NextResponse.json(target, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating target:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}