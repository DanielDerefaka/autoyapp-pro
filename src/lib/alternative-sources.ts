// Alternative data sources when X API fails
import RSS from 'rss-parser'

interface AlternativeSource {
  type: 'rss' | 'nitter' | 'mock' | 'manual'
  url?: string
  data?: any[]
}

export class AlternativeDataSources {
  private rssParser = new RSS()

  // Try RSS feeds for Twitter data (some users have RSS feeds)
  async tryRSSFeed(username: string): Promise<any[]> {
    try {
      // Some services provide RSS feeds for Twitter users
      const rssUrls = [
        `https://nitter.net/${username}/rss`,
        `https://nitter.it/${username}/rss`,
        `https://twiiit.com/${username}/rss`,
      ]

      for (const url of rssUrls) {
        try {
          console.log(`🔗 Trying RSS feed: ${url}`)
          const feed = await this.rssParser.parseURL(url)
          
          if (feed.items && feed.items.length > 0) {
            console.log(`✅ Found ${feed.items.length} items from RSS feed`)
            
            return feed.items.slice(0, 10).map((item, index) => ({
              tweetId: `rss_${username}_${index}_${Date.now()}`,
              content: item.title || item.contentSnippet || '',
              authorUsername: username,
              publishedAt: item.pubDate || new Date().toISOString(),
              likeCount: 0,
              replyCount: 0,
              retweetCount: 0,
              sentimentScore: 0,
              scrapedAt: new Date().toISOString(),
              source: 'rss'
            }))
          }
        } catch (e) {
          console.log(`❌ RSS feed failed: ${url}`)
          continue
        }
      }
    } catch (error) {
      console.error(`RSS feed error for ${username}:`, error)
    }
    
    return []
  }

  // Generate realistic demo data for testing
  generateDemoData(username: string, count: number = 5): any[] {
    const demoTweets = [
      "Just launched my new project! Excited to share it with everyone 🚀",
      "Working on some interesting AI applications. The future is here!",
      "Great meeting with the team today. Building something amazing together.",
      "Thoughts on the current state of tech? Things are moving fast.",
      "Weekend coding session was productive. New features coming soon!",
      "Reading about the latest developments in the industry. Fascinating stuff.",
      "Thanks to everyone who supported our latest release. Means a lot!",
      "Brainstorming new ideas for the next quarter. Exciting times ahead.",
      "Just finished an excellent book on entrepreneurship. Highly recommend!",
      "Coffee and code - the perfect combination for a productive morning ☕"
    ]

    return Array.from({ length: count }, (_, index) => ({
      tweetId: `demo_${username}_${index}_${Date.now()}`,
      content: demoTweets[index % demoTweets.length],
      authorUsername: username,
      publishedAt: new Date(Date.now() - (index * 3600000)).toISOString(), // Hours ago
      likeCount: Math.floor(Math.random() * 100) + 10,
      replyCount: Math.floor(Math.random() * 20) + 2,
      retweetCount: Math.floor(Math.random() * 50) + 5,
      sentimentScore: Math.random() * 0.8 + 0.1, // Positive sentiment
      scrapedAt: new Date().toISOString(),
      source: 'demo'
    }))
  }

  // Try multiple fallback methods
  async fetchWithFallbacks(usernames: string[]): Promise<Array<{ username: string, userId: string, tweets: any[], source: string, error?: string }>> {
    const results = []
    const enableDemo = process.env.ENABLE_DEMO_DATA === 'true'

    for (const username of usernames) {
      console.log(`🔄 Trying alternative sources for @${username}`)
      
      // Try RSS feeds first
      let tweets = await this.tryRSSFeed(username)
      let source = 'rss'

      // If RSS fails and demo is enabled, use demo data
      if (tweets.length === 0 && enableDemo) {
        console.log(`📝 Using demo data for @${username}`)
        tweets = this.generateDemoData(username, 5)
        source = 'demo'
      }

      results.push({
        username,
        userId: username,
        tweets,
        source,
        error: tweets.length === 0 ? 'All fallback methods failed' : undefined
      })

      // Small delay between users
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return results
  }
}

// RSS parser installation note for package.json
export const requiredPackages = [
  'rss-parser'
]