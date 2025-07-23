import { ProjectContext, ProjectTweet } from '@/types/enhanced-analysis';
import { rapidApiTwitterClient } from './rapidapi-twitter';
import { prisma } from './prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class DynamicContentFetcher {
  
  /**
   * Fetch latest tweets for mentioned projects
   */
  async fetchProjectContext(projects: ProjectContext[]): Promise<ProjectContext[]> {
    const enhancedProjects: ProjectContext[] = [];
    
    for (const project of projects) {
      try {
        const enhancedProject = await this.fetchSingleProjectContext(project);
        enhancedProjects.push(enhancedProject);
      } catch (error) {
        console.error(`Error fetching context for ${project.projectHandle}:`, error);
        // Return original project without latest tweet
        enhancedProjects.push(project);
      }
    }
    
    return enhancedProjects;
  }
  
  /**
   * Fetch context for a single project
   */
  private async fetchSingleProjectContext(project: ProjectContext): Promise<ProjectContext> {
    // Try to get cached tweet first
    const cachedTweet = await this.getCachedProjectTweet(project.projectHandle);
    
    if (cachedTweet && this.isTweetFresh(cachedTweet.publishedAt)) {
      project.latestTweet = cachedTweet;
      return project;
    }
    
    // Fetch fresh tweet from API
    const latestTweet = await this.fetchLatestTweetFromAPI(project.projectHandle);
    
    if (latestTweet) {
      // Enhance tweet with AI analysis
      const enhancedTweet = await this.enhanceTweetWithAI(latestTweet);
      project.latestTweet = enhancedTweet;
      
      // Cache the tweet for future use
      await this.cacheTweet(project.projectHandle, enhancedTweet);
      
      // Update project context based on latest tweet
      project.projectSentiment = enhancedTweet.sentiment;
      project.relevantTopics = [...new Set([...project.relevantTopics, ...enhancedTweet.topics])];
    }
    
    return project;
  }
  
  /**
   * Get cached project tweet from database
   */
  private async getCachedProjectTweet(projectHandle: string): Promise<ProjectTweet | null> {
    try {
      const cached = await prisma.projectTweetCache.findFirst({
        where: {
          projectHandle: projectHandle.toLowerCase(),
        },
        orderBy: {
          cachedAt: 'desc'
        }
      });
      
      if (!cached) return null;
      
      return {
        id: cached.tweetId,
        content: cached.content,
        publishedAt: cached.publishedAt,
        engagement: JSON.parse(cached.engagement),
        sentiment: cached.sentiment,
        topics: JSON.parse(cached.topics),
      };
    } catch (error) {
      // Table might not exist yet, return null
      return null;
    }
  }
  
  /**
   * Check if tweet is fresh (less than 2 hours old)
   */
  private isTweetFresh(publishedAt: Date): boolean {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    return publishedAt > twoHoursAgo;
  }
  
  /**
   * Fetch latest tweet from Twitter API
   */
  private async fetchLatestTweetFromAPI(username: string): Promise<ProjectTweet | null> {
    try {
      // Use existing RapidAPI client as fallback
      const tweets = await rapidApiTwitterClient.getUserTweets(username, 1);
      
      if (!tweets || tweets.length === 0) {
        return null;
      }
      
      const tweet = tweets[0];
      
      return {
        id: tweet.rest_id || tweet.id_str || Date.now().toString(),
        content: tweet.full_text || tweet.text || '',
        publishedAt: new Date(tweet.created_at),
        engagement: {
          likes: tweet.favorite_count || 0,
          retweets: tweet.retweet_count || 0,
          replies: tweet.reply_count || 0,
        },
        sentiment: 'neutral', // Will be enhanced by AI
        topics: [], // Will be enhanced by AI
      };
    } catch (error) {
      console.error(`Error fetching tweets for ${username}:`, error);
      return null;
    }
  }
  
  /**
   * Enhance tweet with AI analysis
   */
  private async enhanceTweetWithAI(tweet: ProjectTweet): Promise<ProjectTweet> {
    try {
      const prompt = `
Analyze this tweet from a crypto/tech project:

Tweet: "${tweet.content}"

Provide analysis in JSON format:
{
  "sentiment": "positive|negative|neutral|bullish|bearish",
  "topics": ["topic1", "topic2", "topic3"],
  "keyInsights": ["insight1", "insight2"],
  "marketImplications": "brief analysis",
  "engagementPotential": 0.0-1.0
}

Focus on:
- Technical developments
- Partnerships/collaborations  
- Market sentiment
- Product updates
- Community engagement
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        ...tweet,
        sentiment: analysis.sentiment || 'neutral',
        topics: analysis.topics || [],
        // Store additional analysis in metadata
        analysis: {
          keyInsights: analysis.keyInsights || [],
          marketImplications: analysis.marketImplications || '',
          engagementPotential: analysis.engagementPotential || 0.5,
        }
      } as ProjectTweet & { analysis: any };
      
    } catch (error) {
      console.error('Error enhancing tweet with AI:', error);
      return tweet;
    }
  }
  
  /**
   * Cache tweet for future use
   */
  private async cacheTweet(projectHandle: string, tweet: ProjectTweet): Promise<void> {
    try {
      await prisma.projectTweetCache.upsert({
        where: {
          projectHandle_tweetId: {
            projectHandle: projectHandle.toLowerCase(),
            tweetId: tweet.id,
          }
        },
        update: {
          content: tweet.content,
          publishedAt: tweet.publishedAt,
          engagement: JSON.stringify(tweet.engagement),
          sentiment: tweet.sentiment,
          topics: JSON.stringify(tweet.topics),
          cachedAt: new Date(),
        },
        create: {
          projectHandle: projectHandle.toLowerCase(),
          tweetId: tweet.id,
          content: tweet.content,
          publishedAt: tweet.publishedAt,
          engagement: JSON.stringify(tweet.engagement),
          sentiment: tweet.sentiment,
          topics: JSON.stringify(tweet.topics),
          cachedAt: new Date(),
        }
      });
    } catch (error) {
      // If table doesn't exist, create it in migration or ignore for now
      console.log('Could not cache tweet - table might not exist yet');
    }
  }
  
  /**
   * Fetch context for URLs mentioned in tweets
   */
  async fetchUrlContext(urls: string[]): Promise<Array<{url: string, title: string, summary: string}>> {
    const contexts = [];
    
    for (const url of urls.slice(0, 3)) { // Limit to 3 URLs to avoid rate limits
      try {
        const context = await this.analyzeUrl(url);
        if (context) {
          contexts.push(context);
        }
      } catch (error) {
        console.error(`Error fetching URL context for ${url}:`, error);
      }
    }
    
    return contexts;
  }
  
  /**
   * Analyze URL content using AI
   */
  private async analyzeUrl(url: string): Promise<{url: string, title: string, summary: string} | null> {
    try {
      // Basic URL analysis - in production, you'd want to fetch and parse the content
      const prompt = `
Analyze this URL and predict what it might contain based on the domain and path:

URL: ${url}

Provide JSON response:
{
  "predictedTitle": "likely page title",
  "predictedContent": "what this page likely contains",
  "relevance": 0.0-1.0,
  "category": "news|article|documentation|product|social"
}
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        url,
        title: analysis.predictedTitle || 'Link',
        summary: analysis.predictedContent || 'External content',
      };
      
    } catch (error) {
      console.error('Error analyzing URL:', error);
      return null;
    }
  }
  
  /**
   * Get trending topics for temporal context
   */
  async getTrendingContext(): Promise<{trendingTopics: string[], marketSentiment: string}> {
    try {
      // This would integrate with Twitter Trends API or crypto news APIs
      // For now, return mock data structure
      return {
        trendingTopics: ['defi', 'solana', 'ai', 'crypto'],
        marketSentiment: 'neutral'
      };
    } catch (error) {
      console.error('Error fetching trending context:', error);
      return {
        trendingTopics: [],
        marketSentiment: 'neutral'
      };
    }
  }
  
  /**
   * Batch fetch context for multiple projects efficiently
   */
  async batchFetchProjectContext(projectHandles: string[]): Promise<Map<string, ProjectContext>> {
    const results = new Map<string, ProjectContext>();
    const batchSize = 5; // Process in batches to avoid rate limits
    
    for (let i = 0; i < projectHandles.length; i += batchSize) {
      const batch = projectHandles.slice(i, i + batchSize);
      const batchPromises = batch.map(handle => 
        this.fetchSingleProjectContext({
          projectHandle: handle,
          projectName: handle,
          latestTweet: null,
          projectSentiment: 'neutral',
          relevantTopics: [],
          influence: 0.5,
          lastMentioned: new Date(),
        })
      );
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.set(batch[index], result.value);
          }
        });
      } catch (error) {
        console.error('Error in batch processing:', error);
      }
      
      // Add delay between batches
      if (i + batchSize < projectHandles.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

export const dynamicContentFetcher = new DynamicContentFetcher();