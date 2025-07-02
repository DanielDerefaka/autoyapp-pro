import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { xApiClient } from '@/lib/x-api'
import { OAuthStateManager } from '@/lib/oauth-state'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    const clerkUser = await currentUser()

    if (!clerkId || !clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 X OAuth Connect - Clerk ID:', clerkId)

    // Ensure user exists in database
    let user = await prisma.user.findUnique({
      where: { clerkId }
    })

    if (!user) {
      console.log('🔍 User not found, creating new user...')
      user = await prisma.user.create({
        data: {
          clerkId,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
          subscriptionTier: 'free',
        }
      })
      console.log('✅ Created new user:', user.id)
    } else {
      console.log('✅ User exists:', user.id)
    }

    const redirectUri = `${process.env.APP_URL}/api/x-oauth/callback`
    const state = crypto.randomBytes(32).toString('hex')
    
    // Store state in session or database for security
    // For now, we'll include the clerkId in the state
    const secureState = `${clerkId}:${state}`
    
    console.log('🔐 Generating OAuth URL...')
    console.log('  - Redirect URI:', redirectUri)
    console.log('  - State:', secureState)
    
    const { authUrl, codeVerifier } = xApiClient.generateOAuthUrl(redirectUri, secureState)

    console.log('💾 Storing OAuth state...')
    console.log('  - Key:', `oauth:${secureState}`)
    console.log('  - Clerk ID:', clerkId)
    console.log('  - Code Verifier:', codeVerifier ? `${codeVerifier.substring(0, 10)}...` : 'null')

    // Store code verifier with fallback system (expires in 10 minutes)
    await OAuthStateManager.set(`oauth:${secureState}`, {
      codeVerifier,
      clerkId
    }, 600)

    console.log('✅ OAuth state stored successfully')
    console.log('🔗 Generated auth URL:', authUrl.substring(0, 100) + '...')

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error generating X OAuth URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate OAuth URL' },
      { status: 500 }
    )
  }
}