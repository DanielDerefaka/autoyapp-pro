/**
 * Authentication utilities for handling both web and mobile auth
 */

import { auth } from '@clerk/nextjs/server'
import { verifyToken } from '@clerk/backend'
import { NextRequest } from 'next/server'

interface AuthResult {
  userId: string | null
  error?: string
}

/**
 * Unified authentication function that handles both web sessions and mobile bearer tokens
 */
export async function getAuthUserId(request?: NextRequest): Promise<AuthResult> {
  try {
    // First try web session auth
    const webAuth = await auth()
    if (webAuth.userId) {
      console.log('🔐 Authenticated via web session:', webAuth.userId)
      return { userId: webAuth.userId }
    }

    // If no web session and we have a request, try bearer token
    if (request) {
      const authHeader = request.headers.get('authorization')
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7) // Remove 'Bearer ' prefix
        
        try {
          const verifiedToken = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY!
          })
          
          if (verifiedToken.sub) {
            console.log('🔐 Authenticated via bearer token:', verifiedToken.sub)
            return { userId: verifiedToken.sub }
          }
        } catch (tokenError) {
          console.error('❌ Invalid bearer token:', tokenError)
          return { userId: null, error: 'Invalid token' }
        }
      }
    }

    console.log('❌ No authentication found')
    return { userId: null, error: 'No authentication provided' }
  } catch (error) {
    console.error('❌ Authentication error:', error)
    return { userId: null, error: 'Authentication failed' }
  }
}

/**
 * Helper function to get user ID from either web or mobile auth
 * Throws an error if not authenticated
 */
export async function requireAuth(request?: NextRequest): Promise<string> {
  const { userId, error } = await getAuthUserId(request)
  
  if (!userId) {
    throw new Error(error || 'Authentication required')
  }
  
  return userId
}

/**
 * Enhanced auth function for API routes that handles both web and mobile
 */
export async function apiAuth(request: NextRequest): Promise<AuthResult> {
  return getAuthUserId(request)
}