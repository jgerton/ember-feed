import { prisma } from './db'
import { cache } from './cache'

interface UserProfile {
  sourcePreferences: Record<string, number> // source -> affinity score
  topKeywords: string[] // most common keywords in read articles
  totalInteractions: number
  upvoteRate: number
  readRate: number
}

interface ArticleScore {
  articleId: string
  personalizedScore: number
  breakdown: {
    baseScore: number
    sourceBonus: number
    topicBonus: number
    recencyBonus: number
    diversityPenalty: number
  }
}

type DiversityLevel = 'low' | 'medium' | 'high'

interface DiversityConfig {
  level: DiversityLevel
  sourceThreshold: number // Max articles from same source before penalty
  topicThreshold: number // Max articles on same topic before penalty
  penaltyStrength: number // How strong the penalty is
}

/**
 * Build a user profile from their activity history.
 *
 * Analyzes all user activities (read, upvote, downvote, save) to create a profile containing:
 * - Source preferences: How much the user engages with each news source
 * - Top keywords: Most common keywords from articles user engaged with
 * - Interaction metrics: Total interactions, upvote rate, read rate
 *
 * @returns {Promise<UserProfile>} User profile with preferences and metrics
 *
 * @example
 * const profile = await buildUserProfile();
 * console.log(profile.sourcePreferences); // { "Hacker News": 1.5, "Dev.to": 0.8 }
 * console.log(profile.topKeywords); // ["javascript", "react", "typescript"]
 *
 * @remarks
 * - Cached for 5 minutes to avoid expensive rebuilds
 * - Source affinity calculated as: (upvotes * 2 + reads) / total_from_source
 * - Returns empty profile if user has no activity history
 */
export async function buildUserProfile(): Promise<UserProfile> {
  // Check cache first
  const cached = await cache.get<UserProfile>('user-profile')
  if (cached) {
    return cached
  }

  const activities = await prisma.userActivity.findMany({
    include: {
      article: true
    },
    orderBy: {
      timestamp: 'desc'
    }
  })

  if (activities.length === 0) {
    const emptyProfile = {
      sourcePreferences: {},
      topKeywords: [],
      totalInteractions: 0,
      upvoteRate: 0,
      readRate: 0
    }
    await cache.set('user-profile', emptyProfile, 300) // Cache for 5 minutes
    return emptyProfile
  }

  // Calculate source preferences
  const sourceInteractions: Record<string, { total: number; upvotes: number; reads: number }> = {}

  activities.forEach(activity => {
    const source = activity.article.source
    if (!sourceInteractions[source]) {
      sourceInteractions[source] = { total: 0, upvotes: 0, reads: 0 }
    }

    sourceInteractions[source].total++
    if (activity.action === 'upvote') sourceInteractions[source].upvotes++
    if (activity.action === 'read') sourceInteractions[source].reads++
  })

  // Calculate source affinity (higher = user prefers this source)
  const sourcePreferences: Record<string, number> = {}
  Object.entries(sourceInteractions).forEach(([source, stats]) => {
    // Affinity = (upvotes * 2 + reads) / total_articles_from_source
    const affinity = (stats.upvotes * 2 + stats.reads) / stats.total
    sourcePreferences[source] = affinity
  })

  // Extract top keywords from articles user engaged with
  const engagedArticles = activities
    .filter(a => a.action === 'upvote' || a.action === 'read' || a.action === 'save')
    .map(a => a.article)

  const keywordFrequency: Record<string, number> = {}
  engagedArticles.forEach(article => {
    const keywords = extractKeywords(article.title + ' ' + article.description)
    keywords.forEach(keyword => {
      keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1
    })
  })

  const topKeywords = Object.entries(keywordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([keyword]) => keyword)

  // Calculate rates
  const upvotes = activities.filter(a => a.action === 'upvote').length
  const reads = activities.filter(a => a.action === 'read').length
  const upvoteRate = upvotes / activities.length
  const readRate = reads / activities.length

  const profile = {
    sourcePreferences,
    topKeywords,
    totalInteractions: activities.length,
    upvoteRate,
    readRate
  }

  // Cache the profile for 5 minutes
  await cache.set('user-profile', profile, 300)

  return profile
}

/**
 * Get diversity configuration based on user settings
 */
async function getDiversityConfig(): Promise<DiversityConfig> {
  // Get user settings (there's only one user in this app)
  let settings = await prisma.userSettings.findFirst()

  // Create default settings if none exist
  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { diversityLevel: 'medium' }
    })
  }

  const level = (settings.diversityLevel as DiversityLevel) || 'medium'

  // Configure thresholds and penalty strength based on level
  const configs: Record<DiversityLevel, DiversityConfig> = {
    low: {
      level: 'low',
      sourceThreshold: 5, // Allow up to 5 articles from same source
      topicThreshold: 6, // Allow up to 6 articles on same topic
      penaltyStrength: 5 // Light penalty
    },
    medium: {
      level: 'medium',
      sourceThreshold: 3, // Allow up to 3 articles from same source
      topicThreshold: 4, // Allow up to 4 articles on same topic
      penaltyStrength: 15 // Moderate penalty
    },
    high: {
      level: 'high',
      sourceThreshold: 2, // Allow up to 2 articles from same source
      topicThreshold: 3, // Allow up to 3 articles on same topic
      penaltyStrength: 30 // Strong penalty
    }
  }

  return configs[level]
}

/**
 * Apply diversity re-ranking to prevent echo chambers
 * This ensures a mix of sources and topics in the final feed
 */
async function applyDiversityReranking(
  scores: ArticleScore[],
  articles: any[],
  limit: number
): Promise<ArticleScore[]> {
  const config = await getDiversityConfig()

  // Create article lookup map
  const articleMap = new Map(articles.map(a => [a.id, a]))

  // Track source and topic usage
  const sourceCount: Record<string, number> = {}
  const topicCount: Record<string, number> = {}

  // Re-rank by selecting diverse articles
  const reranked: ArticleScore[] = []
  const remaining = [...scores]

  while (reranked.length < limit && remaining.length > 0) {
    // Calculate adjusted scores for remaining articles
    const adjustedScores = remaining.map((score, index) => {
      const article = articleMap.get(score.articleId)
      if (!article) return { score, index, adjustedScore: 0 }

      let penalty = 0

      // Source diversity penalty
      const sourceUsage = sourceCount[article.source] || 0
      if (sourceUsage >= config.sourceThreshold) {
        penalty += config.penaltyStrength * (sourceUsage - config.sourceThreshold + 1)
      }

      // Topic diversity penalty
      if (article.topics && article.topics.length > 0) {
        const primaryTopic = article.topics[0]?.topic?.slug
        if (primaryTopic) {
          const topicUsage = topicCount[primaryTopic] || 0
          if (topicUsage >= config.topicThreshold) {
            penalty += config.penaltyStrength * (topicUsage - config.topicThreshold + 1)
          }
        }
      }

      return {
        score,
        index,
        adjustedScore: score.personalizedScore - penalty
      }
    })

    // Select article with highest adjusted score
    adjustedScores.sort((a, b) => b.adjustedScore - a.adjustedScore)
    const selected = adjustedScores[0]

    // Add to reranked list
    reranked.push(selected.score)

    // Update source and topic counts
    const selectedArticle = articleMap.get(selected.score.articleId)
    if (selectedArticle) {
      sourceCount[selectedArticle.source] = (sourceCount[selectedArticle.source] || 0) + 1

      if (selectedArticle.topics && selectedArticle.topics.length > 0) {
        const primaryTopic = selectedArticle.topics[0]?.topic?.slug
        if (primaryTopic) {
          topicCount[primaryTopic] = (topicCount[primaryTopic] || 0) + 1
        }
      }
    }

    // Remove selected article from remaining
    remaining.splice(selected.index, 1)
  }

  return reranked
}

/**
 * Calculate personalized scores for all articles based on user profile and behavior.
 *
 * Scoring algorithm combines multiple signals:
 * - Base score: Article's inherent quality score from RSS (0-100)
 * - Source bonus: User's affinity for the article's source (0-50)
 * - Topic bonus: Reserved for future topic-based scoring (0-30)
 * - Recency bonus: Boosts recent articles (0-15)
 * - Diversity penalty: Negative points for recently-read articles (-20)
 *
 * @returns {Promise<ArticleScore[]>} Array of articles with personalized scores and breakdowns
 *
 * @example
 * const scores = await calculatePersonalizedScores();
 * scores.forEach(score => {
 *   console.log(score.articleId, score.personalizedScore, score.breakdown);
 * });
 *
 * @remarks
 * - Fetches user profile (cached for 5 minutes)
 * - Applies diversity penalty to articles read in last 24 hours
 * - Final score clamped to 0-100 range
 * - Does NOT filter articles, returns all with scores
 */
export async function calculatePersonalizedScores(): Promise<ArticleScore[]> {
  const profile = await buildUserProfile()
  const articles = await prisma.article.findMany({
    orderBy: { publishedAt: 'desc' }
  })

  // Get recent activity for diversity penalty
  const recentActivities = await prisma.userActivity.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    },
    select: { articleId: true }
  })
  const recentArticleIds = new Set(recentActivities.map(a => a.articleId))

  const scores: ArticleScore[] = articles.map(article => {
    const breakdown = {
      baseScore: article.score,
      sourceBonus: 0,
      topicBonus: 0,
      recencyBonus: 0,
      diversityPenalty: 0
    }

    // Source bonus: multiply by source affinity
    if (profile.sourcePreferences[article.source]) {
      breakdown.sourceBonus = profile.sourcePreferences[article.source] * 10
    }

    // Topic bonus: check keyword overlap
    const articleKeywords = extractKeywords(article.title + ' ' + article.description)
    const matchingKeywords = articleKeywords.filter(k => profile.topKeywords.includes(k))
    breakdown.topicBonus = matchingKeywords.length * 5

    // Recency bonus: newer articles get boost
    const ageInHours = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60)
    if (ageInHours < 6) breakdown.recencyBonus = 15
    else if (ageInHours < 24) breakdown.recencyBonus = 10
    else if (ageInHours < 48) breakdown.recencyBonus = 5

    // Diversity penalty: avoid showing articles from sources you just read
    if (recentArticleIds.has(article.id)) {
      breakdown.diversityPenalty = -10
    }

    // Calculate final score
    const personalizedScore = Math.max(0, Math.min(100,
      breakdown.baseScore +
      breakdown.sourceBonus +
      breakdown.topicBonus +
      breakdown.recencyBonus +
      breakdown.diversityPenalty
    ))

    return {
      articleId: article.id,
      personalizedScore,
      breakdown
    }
  })

  // Sort by personalized score
  return scores.sort((a, b) => b.personalizedScore - a.personalizedScore)
}

/**
 * Update article scores in database with personalized rankings
 */
export async function updatePersonalizedScores(): Promise<{ updated: number }> {
  const scores = await calculatePersonalizedScores()
  let updated = 0

  for (const score of scores) {
    await prisma.article.update({
      where: { id: score.articleId },
      data: { score: Math.round(score.personalizedScore) }
    })
    updated++
  }

  return { updated }
}

/**
 * Get personalized article feed with diversity re-ranking.
 *
 * This is the main entry point for the ML-powered feed. It combines:
 * 1. Personalized scoring based on user behavior
 * 2. Diversity re-ranking to prevent echo chambers
 * 3. Optional topic filtering
 *
 * Process:
 * 1. Calculate personalized scores for all articles
 * 2. Filter by topic if specified
 * 3. Fetch articles with topic metadata
 * 4. Apply diversity re-ranking (balances sources & topics)
 * 5. Return final ordered list
 *
 * @param {number} limit - Maximum number of articles to return (default: 20)
 * @param {string | null} topicSlug - Optional topic slug to filter by (e.g., "ai", "web-development")
 * @returns {Promise<Article[]>} Ordered articles with full details and topic information
 *
 * @example
 * // Get top 10 personalized articles
 * const feed = await getPersonalizedFeed(10);
 *
 * // Get top 20 AI articles with diversity
 * const aiFeed = await getPersonalizedFeed(20, "ai");
 *
 * @remarks
 * - Diversity re-ranking prevents over-representation of any single source or topic
 * - Diversity level configured in user settings (low/medium/high)
 * - Topic filter applied BEFORE diversity re-ranking for accurate balancing
 * - Returns articles with full topic metadata (sorted by relevance)
 */
export async function getPersonalizedFeed(limit: number = 20, topicSlug?: string | null) {
  const scores = await calculatePersonalizedScores()

  // If topic filter specified, only include articles with that topic
  let filteredScores = scores
  if (topicSlug) {
    const articlesWithTopic = await prisma.article.findMany({
      where: {
        topics: {
          some: {
            topic: {
              slug: topicSlug
            }
          }
        }
      },
      select: { id: true }
    })
    const topicArticleIds = new Set(articlesWithTopic.map(a => a.id))
    filteredScores = scores.filter(s => topicArticleIds.has(s.articleId))
  }

  // Fetch articles with topics for diversity re-ranking
  const articles = await prisma.article.findMany({
    where: {
      id: { in: filteredScores.map(s => s.articleId) }
    },
    include: {
      topics: {
        include: {
          topic: {
            select: {
              name: true,
              slug: true
            }
          }
        },
        orderBy: {
          relevance: 'desc'
        }
      }
    }
  })

  // Apply diversity re-ranking to prevent echo chambers
  const rerankedScores = await applyDiversityReranking(filteredScores, articles, limit)

  // Get final article IDs in diversity-optimized order
  const topArticleIds = rerankedScores.map(s => s.articleId)

  // Sort articles by the diversity-optimized order
  const articleMap = new Map(articles.map(a => [a.id, a]))
  return topArticleIds.map(id => articleMap.get(id)!).filter(Boolean)
}

/**
 * Extract keywords from text (simple implementation)
 */
function extractKeywords(text: string): string[] {
  // Common stopwords to filter out
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
    'this', 'that', 'these', 'those', 'it', 'its', 'you', 'your', 'we',
    'our', 'they', 'their', 'has', 'have', 'had', 'will', 'would', 'can',
    'could', 'should', 'may', 'might', 'must', 'how', 'what', 'when', 'where',
    'why', 'who', 'which', 'if', 'then', 'than', 'so', 'now', 'new', 'more'
  ])

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // Remove special chars
    .split(/\s+/) // Split on whitespace
    .filter(word => word.length > 3) // Min length 4
    .filter(word => !stopwords.has(word)) // Remove stopwords
    .filter(word => !/^\d+$/.test(word)) // Remove pure numbers
}

/**
 * Calculate similarity score between two articles based on keywords and topics
 */
function calculateArticleSimilarity(
  article1: { title: string; description: string; topics?: any[] },
  article2: { title: string; description: string; topics?: any[] }
): number {
  // Keyword overlap score
  const keywords1 = extractKeywords(article1.title + ' ' + article1.description)
  const keywords2 = extractKeywords(article2.title + ' ' + article2.description)
  const keywordOverlap = keywords1.filter(k => keywords2.includes(k)).length
  const keywordScore = (keywordOverlap / Math.max(keywords1.length, keywords2.length)) * 100

  // Topic overlap score
  let topicScore = 0
  if (article1.topics && article2.topics) {
    const topics1 = article1.topics.map((t: any) => t.topic?.slug || t.topicId).filter(Boolean)
    const topics2 = article2.topics.map((t: any) => t.topic?.slug || t.topicId).filter(Boolean)
    const topicOverlap = topics1.filter(t => topics2.includes(t)).length
    if (topics1.length > 0 || topics2.length > 0) {
      topicScore = (topicOverlap / Math.max(topics1.length, topics2.length)) * 100
    }
  }

  // Weighted combination: 60% keywords, 40% topics
  return keywordScore * 0.6 + topicScore * 0.4
}

interface RecommendationScore {
  articleId: string
  score: number
  breakdown: {
    similarityScore: number
    topicAffinityScore: number
    sourceAffinityScore: number
    serendipityBonus: number
    recencyBonus: number
  }
  reason: string
}

/**
 * Get personalized article recommendations based on user's reading history.
 *
 * Implements a hybrid recommendation algorithm combining:
 * 1. Content-based filtering: Finds articles similar to ones user upvoted/saved
 * 2. Collaborative signals: Uses source and topic preferences from behavior
 * 3. Exploration bonus: Encourages discovery of new quality sources
 * 4. Recency boost: Prioritizes fresh content
 *
 * Scoring signals (all normalized 0-100):
 * - Similarity score: Keyword/topic overlap with upvoted articles (0-100)
 * - Topic affinity: Matches user's top 5 most-engaged topics (0-40)
 * - Source affinity: Prefers sources user engages with (0-15)
 * - Serendipity bonus: Rewards quality articles from unexplored sources (0-20)
 * - Recency bonus: Boosts articles from last 12-48 hours (0-15)
 *
 * @param {number} limit - Maximum number of recommendations to return (default: 10, max: 50)
 * @returns {Promise<RecommendationScore[]>} Recommended articles with scores, reasons, and breakdowns
 *
 * @example
 * const recommendations = await getRecommendations(5);
 * recommendations.forEach(rec => {
 *   console.log(rec.articleId, rec.score, rec.reason);
 *   console.log('  Breakdown:', rec.breakdown);
 * });
 *
 * @remarks
 * - Automatically filters out already-read articles
 * - Analyzes last 20 upvoted/saved articles for similarity matching
 * - Identifies user's top 5 topics by engagement frequency
 * - Considers top 200 recent articles as candidates
 * - Minimum score threshold of 10 to filter weak recommendations
 * - Cached user profile (5 min) for performance
 * - Personalized reasons: "Similar to articles you upvoted", "Based on your interest in X"
 */
export async function getRecommendations(limit: number = 10): Promise<RecommendationScore[]> {
  const profile = await buildUserProfile() // Now cached

  // Get article IDs user has interacted with (lightweight query for exclusion)
  const allActivities = await prisma.userActivity.findMany({
    select: { articleId: true }
  })
  const interactedArticleIds = new Set(allActivities.map(a => a.articleId))

  // Get recently upvoted/saved articles for similarity matching (uses new action index)
  const engagedActivities = await prisma.userActivity.findMany({
    where: {
      action: { in: ['upvote', 'save'] } // Uses action index
    },
    include: {
      article: {
        include: {
          topics: {
            include: {
              topic: {
                select: {
                  name: true,
                  slug: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { timestamp: 'desc' },
    take: 20 // Limit to last 20 engaged articles
  })

  const engagedArticles = engagedActivities.map(a => a.article)

  // Get top topics user engages with (from engaged articles only)
  const topicCounts: Record<string, number> = {}
  engagedActivities.forEach(activity => {
    activity.article.topics?.forEach(t => {
      const slug = t.topic?.slug
      if (slug) {
        topicCounts[slug] = (topicCounts[slug] || 0) + 1
      }
    })
  })
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([slug]) => slug)

  // Get candidate articles (exclude already-read, reduced from 200 to 100 for performance)
  const candidateArticles = await prisma.article.findMany({
    where: {
      id: { notIn: Array.from(interactedArticleIds) }
    },
    include: {
      topics: {
        include: {
          topic: {
            select: {
              name: true,
              slug: true
            }
          }
        },
        orderBy: {
          relevance: 'desc'
        }
      }
    },
    orderBy: { publishedAt: 'desc' },
    take: 100 // Reduced from 200 for better performance
  })

  // Score each candidate article
  const recommendations: RecommendationScore[] = candidateArticles.map(article => {
    const breakdown = {
      similarityScore: 0,
      topicAffinityScore: 0,
      sourceAffinityScore: 0,
      serendipityBonus: 0,
      recencyBonus: 0
    }
    let reason = ''

    // 1. Similarity to engaged articles
    if (engagedArticles.length > 0) {
      const similarities = engagedArticles.map(engagedArticle =>
        calculateArticleSimilarity(article, engagedArticle)
      )
      breakdown.similarityScore = Math.max(...similarities)
      if (breakdown.similarityScore > 30) {
        reason = 'Similar to articles you upvoted'
      }
    }

    // 2. Topic affinity
    const articleTopics = article.topics?.map(t => t.topic?.slug).filter(Boolean) || []
    const topicMatches = articleTopics.filter(slug => topTopics.includes(slug))
    if (topicMatches.length > 0) {
      breakdown.topicAffinityScore = (topicMatches.length / topTopics.length) * 40
      if (!reason) reason = `Based on your interest in ${topicMatches[0]}`
    }

    // 3. Source affinity
    if (profile.sourcePreferences[article.source]) {
      breakdown.sourceAffinityScore = profile.sourcePreferences[article.source] * 15
    }

    // 4. Serendipity bonus (explore new sources)
    const userHasReadFromSource = engagedActivities.some(a => a.article.source === article.source)
    if (!userHasReadFromSource && article.score > 50) {
      breakdown.serendipityBonus = 20
      if (!reason) reason = 'Discover new sources'
    }

    // 5. Recency bonus
    const ageInHours = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60)
    if (ageInHours < 12) breakdown.recencyBonus = 15
    else if (ageInHours < 24) breakdown.recencyBonus = 10
    else if (ageInHours < 48) breakdown.recencyBonus = 5

    // Calculate final score
    const totalScore = Math.max(0, Math.min(100,
      breakdown.similarityScore +
      breakdown.topicAffinityScore +
      breakdown.sourceAffinityScore +
      breakdown.serendipityBonus +
      breakdown.recencyBonus
    ))

    if (!reason) reason = 'Recommended for you'

    return {
      articleId: article.id,
      score: totalScore,
      breakdown,
      reason
    }
  })

  // Sort by score and return top N
  return recommendations
    .filter(r => r.score > 10) // Minimum threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
