import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to your environment variables')
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing required headers' }, { status: 400 })
  }

  const payload = await request.text()
  const body = JSON.parse(payload)

  const wh = new Webhook(webhookSecret)

  let evt: any

  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    })
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 })
  }

  const { id: clerkId } = evt.data
  const eventType = evt.type

  try {
    switch (eventType) {
      case 'user.created':
        await prisma.user.create({
          data: {
            clerkId,
            email: evt.data.email_addresses[0].email_address,
            name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim() || null,
          },
        })
        break

      case 'user.updated':
        await prisma.user.update({
          where: { clerkId },
          data: {
            email: evt.data.email_addresses[0].email_address,
            name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim() || null,
          },
        })
        break

      case 'user.deleted':
        await prisma.user.delete({
          where: { clerkId },
        })
        break

      default:
        console.log(`Unhandled webhook event type: ${eventType}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}