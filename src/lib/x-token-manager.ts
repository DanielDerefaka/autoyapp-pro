import { prisma } from './prisma'
import { xApiClient } from './x-api'

export class XTokenManager {
  /**
   * Automatically handles token refresh for X API operations
   * Retries the operation with a fresh token if the original fails with 401
   */
  static async withTokenRefresh<T>(
    xAccountId: string,
    operation: (accessToken: string) => Promise<T>
  ): Promise<T> {
    console.log(`🔑 Executing X API operation for account ${xAccountId}`)
    
    // Get the X account with current tokens
    const xAccount = await prisma.xAccount.findUnique({
      where: { id: xAccountId },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        username: true,
        isActive: true,
        lastActivity: true
      }
    })

    if (!xAccount) {
      throw new Error(`X Account not found: ${xAccountId}`)
    }

    if (!xAccount.isActive) {
      throw new Error(`X Account is inactive: ${xAccount.username}`)
    }

    // Decrypt current access token
    let currentAccessToken = Buffer.from(xAccount.accessToken, 'base64').toString('utf-8')
    
    try {
      console.log(`📤 Attempting X API operation with current token for @${xAccount.username}`)
      
      // Try the operation with current token
      const result = await operation(currentAccessToken)
      
      // Update last activity on success
      await prisma.xAccount.update({
        where: { id: xAccountId },
        data: { lastActivity: new Date() }
      })
      
      console.log(`✅ X API operation successful for @${xAccount.username}`)
      return result
      
    } catch (error: any) {
      console.log(`❌ X API operation failed for @${xAccount.username}:`, error.message)
      
      // Check if this is a token expiration error
      if (this.isTokenExpiredError(error)) {
        console.log(`🔄 Token expired for @${xAccount.username}, attempting refresh...`)
        
        try {
          // Refresh the token
          const newTokens = await this.refreshXAccountToken(xAccount)
          
          console.log(`✅ Token refreshed successfully for @${xAccount.username}`)
          console.log(`🔄 Retrying X API operation with new token...`)
          
          // Retry the operation with new token
          const result = await operation(newTokens.accessToken)
          
          console.log(`✅ X API operation successful after token refresh for @${xAccount.username}`)
          return result
          
        } catch (refreshError: any) {
          console.error(`❌ Token refresh failed for @${xAccount.username}:`, refreshError.message)
          
          // Mark account as inactive if refresh fails
          await prisma.xAccount.update({
            where: { id: xAccountId },
            data: { 
              isActive: false,
              lastActivity: new Date()
            }
          })
          
          throw new Error(`X Account authentication failed for @${xAccount.username}. Please reconnect your Twitter account.`)
        }
      }
      
      // Re-throw non-auth errors
      throw error
    }
  }

  /**
   * Check if an error indicates token expiration
   */
  private static isTokenExpiredError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || ''
    const errorString = error.toString?.()?.toLowerCase() || ''
    
    // Common patterns for expired/invalid token errors
    const expiredTokenPatterns = [
      'unauthorized',
      'invalid_token',
      'token_expired',
      'expired_token',
      'authentication_failed',
      '401',
      'invalid access token',
      'could not authenticate you'
    ]
    
    return expiredTokenPatterns.some(pattern => 
      errorMessage.includes(pattern) || errorString.includes(pattern)
    )
  }

  /**
   * Refresh tokens for a specific X account
   */
  private static async refreshXAccountToken(xAccount: {
    id: string
    refreshToken: string
    username: string
  }): Promise<{ accessToken: string; refreshToken: string }> {
    
    if (!xAccount.refreshToken) {
      throw new Error('No refresh token available')
    }

    // Decrypt refresh token
    const currentRefreshToken = Buffer.from(xAccount.refreshToken, 'base64').toString('utf-8')
    
    console.log(`🔄 Refreshing tokens for @${xAccount.username}...`)
    
    // Call X API to refresh token
    const tokenResponse = await xApiClient.refreshToken(currentRefreshToken, xAccount.id)
    
    if (!tokenResponse.access_token) {
      throw new Error('No access token received from refresh')
    }
    
    // Encrypt new tokens
    const newAccessToken = Buffer.from(tokenResponse.access_token).toString('base64')
    const newRefreshToken = tokenResponse.refresh_token 
      ? Buffer.from(tokenResponse.refresh_token).toString('base64')
      : xAccount.refreshToken // Keep old refresh token if new one not provided
    
    // Update tokens in database
    await prisma.xAccount.update({
      where: { id: xAccount.id },
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        lastActivity: new Date(),
        isActive: true // Reactivate account
      }
    })
    
    console.log(`✅ Tokens updated in database for @${xAccount.username}`)
    
    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || currentRefreshToken
    }
  }

  /**
   * Check if an X account's token is likely expired and needs refresh
   * This is a proactive check based on time since last activity
   */
  static async isTokenLikelyExpired(xAccountId: string): Promise<boolean> {
    const xAccount = await prisma.xAccount.findUnique({
      where: { id: xAccountId },
      select: { lastActivity: true, isActive: true }
    })

    if (!xAccount || !xAccount.isActive) {
      return true
    }

    // If no recent activity, consider token potentially expired
    if (!xAccount.lastActivity) {
      return true
    }

    // X API tokens typically expire after 2 hours for free tier
    // Check if it's been more than 1.5 hours since last successful activity
    const hoursSinceActivity = (Date.now() - xAccount.lastActivity.getTime()) / (1000 * 60 * 60)
    
    return hoursSinceActivity > 1.5
  }

  /**
   * Get all active X accounts that may need token refresh
   */
  static async getAccountsNeedingRefresh(): Promise<string[]> {
    const accounts = await prisma.xAccount.findMany({
      where: { 
        isActive: true,
        lastActivity: {
          lt: new Date(Date.now() - 1.5 * 60 * 60 * 1000) // 1.5 hours ago
        }
      },
      select: { id: true }
    })

    return accounts.map(account => account.id)
  }
}