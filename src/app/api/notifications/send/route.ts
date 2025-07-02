import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const sendEmailSchema = z.object({
  type: z.enum(['welcome', 'daily_digest', 'compliance_alert', 'weekly_report', 'success_notification']),
  data: z.record(z.any()),
})

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, data } = sendEmailSchema.parse(body)

    // Get user details
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let result = false

    switch (type) {
      case 'welcome':
        result = await EmailService.sendWelcomeEmail(user.email, user.name || undefined)
        break

      case 'daily_digest':
        result = await EmailService.sendDailyDigest(user.email, data)
        break

      case 'compliance_alert':
        result = await EmailService.sendComplianceAlert(user.email, data)
        break

      case 'weekly_report':
        result = await EmailService.sendWeeklyReport(user.email, data)
        break

      case 'success_notification':
        result = await EmailService.sendSuccessNotification(user.email, data)
        break

      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
    }

    if (result) {
      return NextResponse.json({ success: true, message: 'Email sent successfully' })
    } else {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error sending notification email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}