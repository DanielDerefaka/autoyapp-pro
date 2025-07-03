import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if the X account belongs to the user
    const xAccount = await prisma.xAccount.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!xAccount) {
      return NextResponse.json({ error: 'X account not found' }, { status: 404 })
    }

    // Delete the X account
    await prisma.xAccount.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting X account:', error)
    return NextResponse.json(
      { error: 'Failed to delete X account' },
      { status: 500 }
    )
  }
}