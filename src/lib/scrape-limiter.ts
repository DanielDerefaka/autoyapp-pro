// Simple in-memory rate limiting for scraping to prevent detection
interface ScrapeAttempt {
  timestamp: number
  userCount: number
}

class ScrapeLimiter {
  private attempts: ScrapeAttempt[] = []
  private readonly maxAttemptsPerHour = 3
  private readonly maxUsersPerHour = 10
  private readonly cooldownMinutes = 15

  // Clean up old attempts
  private cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    this.attempts = this.attempts.filter(attempt => attempt.timestamp > oneHourAgo)
  }

  // Check if scraping is allowed
  canScrape(userCount: number = 1): { allowed: boolean; reason?: string; waitTime?: number } {
    this.cleanup()

    // Check attempts in last hour
    const attemptsInLastHour = this.attempts.length
    if (attemptsInLastHour >= this.maxAttemptsPerHour) {
      const oldestAttempt = Math.min(...this.attempts.map(a => a.timestamp))
      const waitTime = (oldestAttempt + (60 * 60 * 1000)) - Date.now()
      return {
        allowed: false,
        reason: `Too many scraping attempts (${attemptsInLastHour}/${this.maxAttemptsPerHour} per hour)`,
        waitTime: Math.max(0, waitTime)
      }
    }

    // Check total users scraped in last hour
    const usersInLastHour = this.attempts.reduce((sum, attempt) => sum + attempt.userCount, 0)
    if (usersInLastHour + userCount > this.maxUsersPerHour) {
      return {
        allowed: false,
        reason: `Too many users scraped (${usersInLastHour + userCount}/${this.maxUsersPerHour} per hour)`,
        waitTime: 60 * 60 * 1000 // Wait 1 hour
      }
    }

    // Check cooldown from last attempt
    if (this.attempts.length > 0) {
      const lastAttempt = Math.max(...this.attempts.map(a => a.timestamp))
      const timeSinceLastAttempt = Date.now() - lastAttempt
      const cooldownMs = this.cooldownMinutes * 60 * 1000
      
      if (timeSinceLastAttempt < cooldownMs) {
        const waitTime = cooldownMs - timeSinceLastAttempt
        return {
          allowed: false,
          reason: `Cooldown period active (${this.cooldownMinutes} min between attempts)`,
          waitTime
        }
      }
    }

    return { allowed: true }
  }

  // Record a scraping attempt
  recordAttempt(userCount: number): void {
    this.attempts.push({
      timestamp: Date.now(),
      userCount
    })
    console.log(`📊 Scrape attempt recorded: ${userCount} users. Total attempts in last hour: ${this.attempts.length}`)
  }

  // Get current status
  getStatus(): {
    attemptsInLastHour: number
    usersInLastHour: number
    maxAttempts: number
    maxUsers: number
    nextAllowedTime?: number
  } {
    this.cleanup()
    
    const usersInLastHour = this.attempts.reduce((sum, attempt) => sum + attempt.userCount, 0)
    let nextAllowedTime: number | undefined

    if (this.attempts.length > 0) {
      const lastAttempt = Math.max(...this.attempts.map(a => a.timestamp))
      nextAllowedTime = lastAttempt + (this.cooldownMinutes * 60 * 1000)
    }

    return {
      attemptsInLastHour: this.attempts.length,
      usersInLastHour,
      maxAttempts: this.maxAttemptsPerHour,
      maxUsers: this.maxUsersPerHour,
      nextAllowedTime
    }
  }

  // Format wait time for display
  formatWaitTime(waitTimeMs: number): string {
    const minutes = Math.ceil(waitTimeMs / (60 * 1000))
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`
    }
    const hours = Math.ceil(minutes / 60)
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }
}

// Singleton instance
export const scrapeLimiter = new ScrapeLimiter()