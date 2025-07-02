import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  templateContent: z.string().min(1).max(1000),
  category: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')

    const whereClause: any = {
      userId: user.id,
    }

    if (category) {
      whereClause.category = category
    }

    if (isActive !== null) {
      whereClause.isActive = isActive === 'true'
    }

    const templates = await prisma.replyTemplate.findMany({
      where: whereClause,
      orderBy: [
        { successRate: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    // Get categories
    const categories = await prisma.replyTemplate.findMany({
      where: {
        userId: user.id,
        category: { not: null },
      },
      select: { category: true },
      distinct: ['category'],
    })

    const uniqueCategories = categories
      .map(t => t.category)
      .filter((category): category is string => category !== null)

    return NextResponse.json({
      templates,
      categories: uniqueCategories,
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

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
    const validatedData = createTemplateSchema.parse(body)

    const template = await prisma.replyTemplate.create({
      data: {
        userId: user.id,
        ...validatedData,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}