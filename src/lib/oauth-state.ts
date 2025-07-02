// Simple in-memory OAuth state storage for development
// In production, use Redis or database storage

interface OAuthState {
  codeVerifier: string
  clerkId: string
  timestamp: number
  expiresAt: number
}

// In-memory store (for development only)
const oauthStateStore = new Map<string, OAuthState>()

// Clean up expired states every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, state] of oauthStateStore.entries()) {
    if (now > state.expiresAt) {
      oauthStateStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export class OAuthStateManager {
  static async set(key: string, data: { codeVerifier: string; clerkId: string }, ttlSeconds: number = 600): Promise<void> {
    try {
      // Try Redis first if available
      const { redis } = await import('./redis')
      await redis.setex(key, ttlSeconds, JSON.stringify({
        ...data,
        timestamp: Date.now()
      }))
      console.log('✅ OAuth state stored in Redis')
    } catch (error) {
      console.log('⚠️ Redis not available, using in-memory storage')
      // Fallback to in-memory storage
      const expiresAt = Date.now() + (ttlSeconds * 1000)
      oauthStateStore.set(key, {
        ...data,
        timestamp: Date.now(),
        expiresAt
      })
    }
  }

  static async get(key: string): Promise<{ codeVerifier: string; clerkId: string } | null> {
    try {
      // Try Redis first if available
      const { redis } = await import('./redis')
      const data = await redis.get(key)
      if (data) {
        console.log('✅ OAuth state retrieved from Redis')
        return typeof data === 'string' ? JSON.parse(data) : data
      }
    } catch (error) {
      console.log('⚠️ Redis not available, checking in-memory storage')
    }

    // Fallback to in-memory storage
    const state = oauthStateStore.get(key)
    if (state) {
      const now = Date.now()
      if (now > state.expiresAt) {
        oauthStateStore.delete(key)
        return null
      }
      console.log('✅ OAuth state retrieved from in-memory storage')
      return {
        codeVerifier: state.codeVerifier,
        clerkId: state.clerkId
      }
    }

    return null
  }

  static async delete(key: string): Promise<void> {
    try {
      // Try Redis first if available
      const { redis } = await import('./redis')
      await redis.del(key)
      console.log('✅ OAuth state deleted from Redis')
    } catch (error) {
      console.log('⚠️ Redis not available, deleting from in-memory storage')
    }

    // Also clean up in-memory storage
    oauthStateStore.delete(key)
  }

  static getStoreSize(): number {
    return oauthStateStore.size
  }

  static clearExpired(): number {
    const now = Date.now()
    let cleared = 0
    for (const [key, state] of oauthStateStore.entries()) {
      if (now > state.expiresAt) {
        oauthStateStore.delete(key)
        cleared++
      }
    }
    return cleared
  }
}