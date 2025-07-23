import { EntityContext, ProjectContext } from '@/types/enhanced-analysis';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Common crypto/web3 projects database
const KNOWN_PROJECTS = {
  // Major DeFi Protocols
  'uniswap': { name: 'Uniswap', handle: 'Uniswap', category: 'dex' },
  'sushiswap': { name: 'SushiSwap', handle: 'SushiSwap', category: 'dex' },
  'compound': { name: 'Compound', handle: 'compoundfinance', category: 'lending' },
  'aave': { name: 'Aave', handle: 'AaveAave', category: 'lending' },
  'makerdao': { name: 'MakerDAO', handle: 'MakerDAO', category: 'stablecoin' },
  
  // Layer 1s
  'ethereum': { name: 'Ethereum', handle: 'ethereum', category: 'blockchain' },
  'solana': { name: 'Solana', handle: 'solana', category: 'blockchain' },
  'avalanche': { name: 'Avalanche', handle: 'avalancheavax', category: 'blockchain' },
  'polygon': { name: 'Polygon', handle: '0xPolygon', category: 'blockchain' },
  'cardano': { name: 'Cardano', handle: 'Cardano', category: 'blockchain' },
  
  // Solana Ecosystem
  'jupiter': { name: 'Jupiter', handle: 'JupiterExchange', category: 'dex' },
  'raydium': { name: 'Raydium', handle: 'RaydiumProtocol', category: 'dex' },
  'meteora': { name: 'Meteora', handle: 'MeteoraAG', category: 'defi' },
  'marginfi': { name: 'MarginFi', handle: 'marginfi', category: 'lending' },
  'drift': { name: 'Drift Protocol', handle: 'DriftProtocol', category: 'trading' },
  'step': { name: 'Step Finance', handle: 'StepFinance_', category: 'defi' },
  'solflare': { name: 'Solflare', handle: 'solflare', category: 'wallet' },
  'phantom': { name: 'Phantom', handle: 'phantom', category: 'wallet' },
  
  // AI/Tech Projects
  'openai': { name: 'OpenAI', handle: 'OpenAI', category: 'ai' },
  'anthropic': { name: 'Anthropic', handle: 'AnthropicAI', category: 'ai' },
  'nvidia': { name: 'NVIDIA', handle: 'nvidia', category: 'hardware' },
  
  // Popular Projects (customize based on your niche)
  'union': { name: 'Union', handle: 'UnionProject', category: 'protocol' },
  'lido': { name: 'Lido', handle: 'LidoFinance', category: 'staking' },
  'curve': { name: 'Curve Finance', handle: 'CurveFinance', category: 'dex' },
  'convex': { name: 'Convex Finance', handle: 'ConvexFinance', category: 'defi' },
};

export class EntityRecognitionEngine {
  
  /**
   * Extract entities from tweet content using regex and AI
   */
  async extractEntities(tweetContent: string): Promise<EntityContext[]> {
    const entities: EntityContext[] = [];
    
    // Extract @mentions
    const mentions = this.extractMentions(tweetContent);
    entities.push(...mentions);
    
    // Extract hashtags
    const hashtags = this.extractHashtags(tweetContent);
    entities.push(...hashtags);
    
    // Extract cashtags ($TOKEN)
    const cashtags = this.extractCashtags(tweetContent);
    entities.push(...cashtags);
    
    // Extract URLs
    const urls = this.extractUrls(tweetContent);
    entities.push(...urls);
    
    // Use AI for advanced entity recognition
    const aiEntities = await this.extractAIEntities(tweetContent);
    entities.push(...aiEntities);
    
    return entities;
  }
  
  /**
   * Extract @mentions from tweet
   */
  private extractMentions(content: string): EntityContext[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: EntityContext[] = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1].toLowerCase();
      const isKnownProject = this.isKnownProject(username);
      
      mentions.push({
        type: 'user',
        text: match[0],
        confidence: isKnownProject ? 0.9 : 0.7,
        context: this.getContextAroundMatch(content, match.index, match[0].length),
        relevance: isKnownProject ? 0.9 : 0.6,
      });
    }
    
    return mentions;
  }
  
  /**
   * Extract hashtags from tweet
   */
  private extractHashtags(content: string): EntityContext[] {
    const hashtagRegex = /#(\w+)/g;
    const hashtags: EntityContext[] = [];
    let match;
    
    while ((match = hashtagRegex.exec(content)) !== null) {
      hashtags.push({
        type: 'hashtag',
        text: match[0],
        confidence: 0.8,
        context: this.getContextAroundMatch(content, match.index, match[0].length),
        relevance: this.calculateHashtagRelevance(match[1]),
      });
    }
    
    return hashtags;
  }
  
  /**
   * Extract cashtags ($TOKEN) from tweet
   */
  private extractCashtags(content: string): EntityContext[] {
    const cashtagRegex = /\$([A-Z]{2,10})\b/g;
    const cashtags: EntityContext[] = [];
    let match;
    
    while ((match = cashtagRegex.exec(content)) !== null) {
      cashtags.push({
        type: 'cashtag',
        text: match[0],
        confidence: 0.9,
        context: this.getContextAroundMatch(content, match.index, match[0].length),
        relevance: 0.8,
      });
    }
    
    return cashtags;
  }
  
  /**
   * Extract URLs from tweet
   */
  private extractUrls(content: string): EntityContext[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls: EntityContext[] = [];
    let match;
    
    while ((match = urlRegex.exec(content)) !== null) {
      urls.push({
        type: 'url',
        text: match[0],
        confidence: 0.9,
        context: this.getContextAroundMatch(content, match.index, match[0].length),
        relevance: 0.7,
      });
    }
    
    return urls;
  }
  
  /**
   * Use AI to extract additional entities and context
   */
  private async extractAIEntities(content: string): Promise<EntityContext[]> {
    try {
      const prompt = `
Analyze this tweet and extract important entities, projects, and concepts:

Tweet: "${content}"

Extract:
1. Project names (even if not @mentioned directly)
2. Important concepts or topics
3. Implicit references to companies/protocols
4. Technical terms or jargon

Return JSON array with format:
[
  {
    "type": "project|concept|term",
    "text": "entity text",
    "confidence": 0.0-1.0,
    "context": "brief context",
    "relevance": 0.0-1.0
  }
]

Focus on crypto, DeFi, tech, and business-related entities.
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      });

      const result = JSON.parse(response.choices[0].message.content || '[]');
      return result.map((entity: any) => ({
        type: entity.type === 'project' ? 'project' : 'user',
        text: entity.text,
        confidence: Math.min(entity.confidence, 1.0),
        context: entity.context,
        relevance: Math.min(entity.relevance, 1.0),
      }));
    } catch (error) {
      console.error('Error in AI entity extraction:', error);
      return [];
    }
  }
  
  /**
   * Identify mentioned projects and get their context
   */
  async identifyMentionedProjects(entities: EntityContext[]): Promise<ProjectContext[]> {
    const projects: ProjectContext[] = [];
    
    for (const entity of entities) {
      if (entity.type === 'user' || entity.type === 'project') {
        const projectInfo = this.getProjectInfo(entity.text);
        
        if (projectInfo || entity.relevance > 0.7) {
          const projectContext: ProjectContext = {
            projectHandle: entity.text.replace('@', ''),
            projectName: projectInfo?.name || entity.text,
            latestTweet: null, // Will be fetched separately
            projectSentiment: 'neutral',
            relevantTopics: this.extractRelevantTopics(entity.context),
            influence: this.calculateInfluenceScore(entity.text),
            lastMentioned: new Date(),
          };
          
          projects.push(projectContext);
        }
      }
    }
    
    return projects;
  }
  
  /**
   * Check if a username is a known project
   */
  private isKnownProject(username: string): boolean {
    return Object.keys(KNOWN_PROJECTS).includes(username.toLowerCase()) ||
           Object.values(KNOWN_PROJECTS).some(p => p.handle.toLowerCase() === username.toLowerCase());
  }
  
  /**
   * Get project information from database
   */
  private getProjectInfo(text: string): typeof KNOWN_PROJECTS[keyof typeof KNOWN_PROJECTS] | null {
    const cleanText = text.replace('@', '').toLowerCase();
    
    // Direct match
    if (KNOWN_PROJECTS[cleanText as keyof typeof KNOWN_PROJECTS]) {
      return KNOWN_PROJECTS[cleanText as keyof typeof KNOWN_PROJECTS];
    }
    
    // Handle match
    const byHandle = Object.values(KNOWN_PROJECTS).find(
      p => p.handle.toLowerCase() === cleanText
    );
    
    return byHandle || null;
  }
  
  /**
   * Get context around a match in the text
   */
  private getContextAroundMatch(content: string, index: number, length: number): string {
    const start = Math.max(0, index - 20);
    const end = Math.min(content.length, index + length + 20);
    return content.substring(start, end).trim();
  }
  
  /**
   * Calculate hashtag relevance based on common patterns
   */
  private calculateHashtagRelevance(hashtag: string): number {
    const relevantTerms = [
      'defi', 'crypto', 'blockchain', 'web3', 'solana', 'ethereum',
      'trading', 'yield', 'farming', 'staking', 'nft', 'dao',
      'ai', 'tech', 'startup', 'build', 'ship', 'launch'
    ];
    
    const tag = hashtag.toLowerCase();
    
    if (relevantTerms.some(term => tag.includes(term))) {
      return 0.9;
    }
    
    // Check if it's a ticker-like hashtag
    if (tag.length <= 5 && tag.match(/^[a-z]+$/)) {
      return 0.7;
    }
    
    return 0.5;
  }
  
  /**
   * Extract relevant topics from context
   */
  private extractRelevantTopics(context: string): string[] {
    const topics: string[] = [];
    const topicKeywords = {
      'defi': ['defi', 'decentralized', 'finance', 'yield', 'farming', 'liquidity'],
      'trading': ['trade', 'trading', 'buy', 'sell', 'price', 'chart'],
      'staking': ['stake', 'staking', 'validator', 'rewards', 'apy'],
      'nft': ['nft', 'collectible', 'art', 'mint', 'opensea'],
      'gaming': ['game', 'gaming', 'play', 'earn', 'p2e'],
      'ai': ['ai', 'artificial', 'intelligence', 'ml', 'model'],
    };
    
    const lowerContext = context.toLowerCase();
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerContext.includes(keyword))) {
        topics.push(topic);
      }
    }
    
    return topics;
  }
  
  /**
   * Calculate influence score for a project/user
   */
  private calculateInfluenceScore(handle: string): number {
    const cleanHandle = handle.replace('@', '').toLowerCase();
    const projectInfo = this.getProjectInfo(cleanHandle);
    
    if (projectInfo) {
      // Major protocols get higher scores
      switch (projectInfo.category) {
        case 'blockchain': return 0.95;
        case 'dex': return 0.9;
        case 'lending': return 0.85;
        case 'stablecoin': return 0.9;
        case 'wallet': return 0.8;
        default: return 0.7;
      }
    }
    
    return 0.5; // Default for unknown entities
  }
}

export const entityRecognition = new EntityRecognitionEngine();