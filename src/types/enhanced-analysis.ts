export interface EnhancedTweetAnalysis {
  semanticMeaning: string;
  mentionedProjects: ProjectContext[];
  conversationThread: ThreadContext | null;
  temporalRelevance: TrendingContext | null;
  replyOpportunityScore: number;
  entities: EntityContext[];
  sentiment: SentimentAnalysis;
  topics: string[];
  engagement: EngagementPrediction;
}

export interface ProjectContext {
  projectHandle: string;
  projectName: string;
  latestTweet: ProjectTweet | null;
  projectSentiment: string;
  relevantTopics: string[];
  influence: number;
  lastMentioned: Date;
}

export interface ProjectTweet {
  id: string;
  content: string;
  publishedAt: Date;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
  sentiment: string;
  topics: string[];
}

export interface ThreadContext {
  isReply: boolean;
  replyToUsername?: string;
  replyToTweetId?: string;
  threadDepth: number;
  conversationTopic: string;
  participants: string[];
  threadSentiment: string;
}

export interface TrendingContext {
  trendingTopics: string[];
  marketSentiment: string;
  viralPotential: number;
  timingScore: number;
  relevantEvents: string[];
}

export interface EntityContext {
  type: 'user' | 'project' | 'hashtag' | 'cashtag' | 'url';
  text: string;
  confidence: number;
  context: string;
  relevance: number;
}

export interface SentimentAnalysis {
  overall: number; // -1 to 1
  confidence: number;
  emotions: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
    disgust: number;
  };
  subjectivity: number; // 0 to 1 (objective to subjective)
}

export interface EngagementPrediction {
  likesPrediction: number;
  replyPrediction: number;
  retweetPrediction: number;
  viralPotential: number;
  optimalReplyTiming: Date;
  confidenceScore: number;
}

export interface EnhancedReplyStrategy {
  strategy: 'project_context' | 'thread_continuation' | 'value_add' | 'opinion_share' | 'question_ask';
  confidence: number;
  reasoning: string;
  suggestedTone: string;
  keyPoints: string[];
  projectContext?: ProjectContext;
  threadContext?: ThreadContext;
}

export interface ContextualReplyRequest {
  tweetId: string;
  tweetContent: string;
  targetUsername: string;
  analysis: EnhancedTweetAnalysis;
  availableReplyDumps: ReplyDumpContext[];
  userStyle: UserStyleContext;
  isVerified: boolean;
}

export interface ReplyDumpContext {
  id: string;
  content: string;
  tags: string[];
  tone: string;
  semanticVector?: number[];
  similarityScore?: number;
  contextRelevance?: number;
}

export interface UserStyleContext {
  preferredTone: string;
  vocabularyLevel: string;
  emojiUsage: string;
  lengthPreference: string;
  topicExpertise: string[];
  engagementStyle: string;
}

export interface SmartReplyResult {
  content: string;
  strategy: EnhancedReplyStrategy;
  usedReplyDump?: {
    id: string;
    originalContent: string;
    adaptationLevel: number;
  };
  confidence: number;
  reasoning: string;
  timing: {
    optimal: Date;
    reasoning: string;
  };
}