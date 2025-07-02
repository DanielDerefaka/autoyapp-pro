import { NextRequest, NextResponse } from 'next/server'
import { xApiClient } from '@/lib/x-api'
import { prisma } from '@/lib/prisma'
import { OAuthStateManager } from '@/lib/oauth-state'

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 X OAuth Callback started')
    
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    console.log('📋 Callback parameters:')
    console.log('  - Code:', code ? `${code.substring(0, 10)}...` : 'null')
    console.log('  - State:', state)
    console.log('  - Error:', error)

    if (error) {
      console.log('❌ OAuth error received:', error)
      return NextResponse.redirect(`${process.env.APP_URL}/settings?error=oauth_denied`)
    }

    if (!code || !state) {
      console.log('❌ Missing code or state parameter')
      return NextResponse.redirect(`${process.env.APP_URL}/settings?error=invalid_callback`)
    }

    console.log('🔍 Retrieving OAuth data for state:', state)
    
    // Retrieve code verifier from storage
    const oauthData = await OAuthStateManager.get(`oauth:${state}`)
    
    if (!oauthData) {
      console.log('❌ OAuth data not found for state:', state)
      return NextResponse.redirect(`${process.env.APP_URL}/settings?error=expired_state`)
    }

    const { codeVerifier, clerkId } = oauthData
    console.log('✅ Retrieved OAuth data:')
    console.log('  - Clerk ID:', clerkId)
    console.log('  - Code Verifier:', codeVerifier ? `${codeVerifier.substring(0, 10)}...` : 'null')

    // Clean up OAuth data
    await OAuthStateManager.delete(`oauth:${state}`)
    console.log('🧹 Cleaned up OAuth data')

    // Find user
    console.log('🔍 Finding user with Clerk ID:', clerkId)
    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    console.log('👤 User lookup result:', user ? `Found: ${user.email} (ID: ${user.id})` : 'Not found')

    if (!user) {
      console.log('❌ User not found in database for Clerk ID:', clerkId)
      return NextResponse.redirect(`${process.env.APP_URL}/settings?error=user_not_found`)
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.APP_URL}/api/x-oauth/callback`
    console.log('🔄 Exchanging code for tokens...')
    console.log('  - Redirect URI:', redirectUri)
    
    const tokenResponse = await xApiClient.exchangeCodeForToken(
      code,
      redirectUri,
      codeVerifier
    )

    console.log('✅ Token exchange successful:')
    console.log('  - Access Token:', tokenResponse.access_token ? `${tokenResponse.access_token.substring(0, 20)}...` : 'null')
    console.log('  - Refresh Token:', tokenResponse.refresh_token ? `${tokenResponse.refresh_token.substring(0, 20)}...` : 'null')
    console.log('  - Token Type:', tokenResponse.token_type)
    // console.log('  - Scope:', tokenResponse.scope)

    // Get user info from X API
    console.log('🔍 Fetching X user info...')
    const xUserResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
      },
    })

    console.log('📡 X API response status:', xUserResponse.status)

    if (!xUserResponse.ok) {
      const errorText = await xUserResponse.text()
      console.log('❌ X API error response:', errorText)
      throw new Error('Failed to fetch X user info')
    }

    const xUserData = await xUserResponse.json()
    const xUser = xUserData.data

    console.log('✅ X User data received:')
    console.log('  - X User ID:', xUser.id)
    console.log('  - Username:', xUser.username)
    console.log('  - Name:', xUser.name)
    console.log('  - Verified:', xUser.verified)

    // Encrypt tokens (in production, use proper encryption)
    const encryptedAccessToken = Buffer.from(tokenResponse.access_token).toString('base64')
    const encryptedRefreshToken = Buffer.from(tokenResponse.refresh_token).toString('base64')

    console.log('🔐 Tokens encrypted for storage')
    console.log('  - Encrypted Access Token length:', encryptedAccessToken.length)
    console.log('  - Encrypted Refresh Token length:', encryptedRefreshToken.length)

    // Store X account
    console.log('💾 Storing X account in database...')
    console.log('  - Database User ID:', user.id)
    console.log('  - X User ID:', xUser.id)
    console.log('  - Username:', xUser.username)

    const savedXAccount = await prisma.xAccount.upsert({
      where: { xUserId: xUser.id },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        username: xUser.username,
        isActive: true,
        lastActivity: new Date(),
      },
      create: {
        userId: user.id,
        xUserId: xUser.id,
        username: xUser.username,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        isActive: true,
        lastActivity: new Date(),
      },
    })

    console.log('✅ X Account saved successfully:')
    console.log('  - Database ID:', savedXAccount.id)
    console.log('  - Username:', savedXAccount.username)
    console.log('  - X User ID:', savedXAccount.xUserId)
    console.log('  - Is Active:', savedXAccount.isActive)
    console.log('  - Last Activity:', savedXAccount.lastActivity)

    // Verify the save by querying again
    console.log('🔍 Verifying saved X account...')
    const verifyXAccount = await prisma.xAccount.findUnique({
      where: { xUserId: xUser.id },
      include: {
        user: {
          select: { email: true, clerkId: true }
        }
      }
    })

    console.log('✅ Verification result:')
    console.log('  - Found X Account:', !!verifyXAccount)
    console.log('  - Associated User Email:', verifyXAccount?.user.email)
    console.log('  - Associated Clerk ID:', verifyXAccount?.user.clerkId)

    console.log('🎉 OAuth callback completed successfully, redirecting...')
    return NextResponse.redirect(`${process.env.APP_URL}/settings?success=x_connected`)
  } catch (error) {
    console.error('Error in X OAuth callback:', error)
    return NextResponse.redirect(`${process.env.APP_URL}/settings?error=oauth_failed`)
  }
}