import { prisma } from './db'

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

/**
 * Build a user profile from their activity history
 */
export async function buildUserProfile(): Promise<UserProfile> {
  const activities = await prisma.userActivity.findMany({
    include: {
      article: true
    },
    orderBy: {
      timestamp: 'desc'
    }
  })

  if (activities.length === 0) {
    return {
      sourcePreferences: {},
      topKeywords: [],
      totalInteractions: 0,
      upvoteRate: 0,
      readRate: 0
    }
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

  return {
    sourcePreferences,
    topKeywords,
    totalInteractions: activities.length,
    upvoteRate,
    readRate
  }
}

/**
 * Calculate personalized scores for all articles
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
 * Get personalized article feed
 */
export async function getPersonalizedFeed(limit: number = 20) {
  const scores = await calculatePersonalizedScores()
  const topArticleIds = scores.slice(0, limit).map(s => s.articleId)

  const articles = await prisma.article.findMany({
    where: {
      id: { in: topArticleIds }
    }
  })

  // Sort by personalized score order
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
