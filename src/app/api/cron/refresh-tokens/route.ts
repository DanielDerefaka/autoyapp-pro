import { NextRequest, NextResponse } from 'next/server'
import { XTokenManager } from '@/lib/x-token-manager'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Flexible authentication for various cron services
    const authHeader = request.headers.get('authorization')
    const userAgent = request.headers.get('user-agent') || ''
    const cronSecret = process.env.CRON_SECRET || 'dev_cron_secret_12345'

    const isValidAuth = 
      authHeader === `Bearer ${cronSecret}` || 
      userAgent.includes('UptimeRobot') ||
      userAgent.includes('vercel-cron') ||
      userAgent.includes('internal-cron-heartbeat') ||
      process.env.NODE_ENV === 'development'

    if (!isValidAuth) {
      console.log('❌ Token refresh authentication failed')
      console.log('Auth header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'null')
      console.log('User agent:', userAgent)
      console.log('💡 For testing: curl -X POST http://localhost:3000/api/cron/refresh-tokens -H "Authorization: Bearer dev_cron_secret_12345"')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Proactive token refresh started...')

    // Get accounts that may need token refresh (older than 1.5 hours activity)
    const accountsNeedingRefresh = await XTokenManager.getAccountsNeedingRefresh()
    
    console.log(`📋 Found ${accountsNeedingRefresh.length} accounts that may need token refresh`)

    if (accountsNeedingRefresh.length === 0) {
      console.log('✅ No accounts need token refresh at this time')
      return NextResponse.json({
        success: true,
        message: 'No accounts need token refresh',
        refreshed: 0
      })
    }

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const accountId of accountsNeedingRefresh) {
      try {
        // Get account details
        const account = await prisma.xAccount.findUnique({
          where: { id: accountId },
          select: { username: true, lastActivity: true }
        })

        if (!account) {
          console.log(`❌ Account ${accountId} not found`)
          continue
        }

        console.log(`🔄 Proactively refreshing tokens for @${account.username}`)
        
        // Use a simple test operation to trigger token refresh if needed
        await XTokenManager.withTokenRefresh(
          accountId,
          async (accessToken: string) => {
            // Simple API call to verify token - get user info
            const response = await fetch('https://api.twitter.com/2/users/me', {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            })

            if (!response.ok) {
              throw new Error(`X API test call failed: ${response.status}`)
            }

            return await response.json()
          }
        )

        results.push({
          accountId,
          username: account.username,
          status: 'success',
          lastActivity: account.lastActivity
        })
        
        successCount++
        console.log(`✅ Token refresh successful for @${account.username}`)

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ Token refresh failed for account ${accountId}:`, error)
        
        results.push({
          accountId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        errorCount++
      }
    }

    console.log(`✅ Proactive token refresh completed: ${successCount} successful, ${errorCount} failed`)

    return NextResponse.json({
      success: true,
      message: `Token refresh completed: ${successCount} successful, ${errorCount} failed`,
      refreshed: successCount,
      failed: errorCount,
      results
    })

  } catch (error) {
    console.error('Error in proactive token refresh:', error)
    return NextResponse.json(
      { error: 'Failed to refresh tokens' },
      { status: 500 }
    )
  }
}