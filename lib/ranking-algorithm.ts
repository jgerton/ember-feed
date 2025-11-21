// Personal recommendation algorithm
import getDb from './db';

export interface Article {
  id: number;
  title: string;
  url: string;
  content?: string;
  summary?: string;
  source: string;
  author?: string;
  published_at: string;
  fetched_at: string;
  popularity_score: number;
  topics?: string; // JSON array
}

export interface RankedArticle extends Article {
  personalizedScore: number;
  scoreBreakdown: {
    recency: number;
    popularity: number;
    source: number;
    topic: number;
    author: number;
  };
}

export interface AlgoConfig {
  weight_recency: number;
  weight_popularity: number;
  weight_source: number;
  weight_topic: number;
  weight_author: number;
  enable_personalization: boolean;
  enable_topic_extraction: boolean;
  min_data_points: number;
}

/**
 * Calculate recency score (time decay function)
 */
function calculateRecencyScore(publishedAt: string): number {
  const now = Date.now();
  const published = new Date(publishedAt).getTime();
  const ageHours = (now - published) / (1000 * 60 * 60);

  // Decay function: newer = higher score
  if (ageHours < 4) return 1.0;
  if (ageHours < 24) return 0.7;
  if (ageHours < 168) return 0.4; // 7 days
  return 0.1;
}

/**
 * Normalize popularity score to 0-1 range
 */
function normalizePopularity(score: number, maxScore: number = 1000): number {
  return Math.min(score / maxScore, 1.0);
}

/**
 * Get source weight from database (learned preference)
 */
function getSourceWeight(source: string, userId: number = 1): number {
  const db = getDb();

  const row = db
    .prepare('SELECT weight FROM source_weights WHERE source = ? AND user_id = ?')
    .get(source, userId) as { weight: number } | undefined;

  return row?.weight ?? 0.5; // Default to neutral
}

/**
 * Get author weight from database (learned preference)
 */
function getAuthorWeight(author: string | undefined, userId: number = 1): number {
  if (!author) return 0.5;

  const db = getDb();

  const row = db
    .prepare('SELECT weight FROM author_weights WHERE author = ? AND user_id = ?')
    .get(author, userId) as { weight: number } | undefined;

  return row?.weight ?? 0.5;
}

/**
 * Calculate topic match score
 * Compares article topics to user's preferred topics
 */
function calculateTopicMatch(
  articleTopics: string[] | undefined,
  userId: number = 1
): number {
  if (!articleTopics || articleTopics.length === 0) return 0.5;

  const db = getDb();

  // Get user's top topics
  const topTopics = db
    .prepare(
      `SELECT topic, preference_score
       FROM topic_preferences
       WHERE user_id = ?
       ORDER BY preference_score DESC
       LIMIT 10`
    )
    .all(userId) as { topic: string; preference_score: number }[];

  if (topTopics.length === 0) return 0.5; // No learned preferences yet

  // Calculate overlap between article topics and user's top topics
  let matchScore = 0;
  for (const articleTopic of articleTopics) {
    const match = topTopics.find(
      (t) => t.topic.toLowerCase() === articleTopic.toLowerCase()
    );
    if (match) {
      matchScore += match.preference_score;
    }
  }

  // Normalize to 0-1
  return Math.min(matchScore / articleTopics.length, 1.0);
}

/**
 * Get algorithm configuration for user
 */
function getAlgoConfig(userId: number = 1): AlgoConfig {
  const db = getDb();

  const config = db
    .prepare('SELECT * FROM algo_config WHERE user_id = ?')
    .get(userId) as AlgoConfig;

  return config;
}

/**
 * Check if user has enough data for personalization
 */
function hasEnoughDataForPersonalization(userId: number = 1): boolean {
  const db = getDb();
  const config = getAlgoConfig(userId);

  const engagementCount = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM article_engagement
       WHERE user_id = ? AND clicked_at IS NOT NULL`
    )
    .get(userId) as { count: number };

  return engagementCount.count >= config.min_data_points;
}

/**
 * Calculate personalized score for an article
 */
export function calculatePersonalizedScore(
  article: Article,
  userId: number = 1
): RankedArticle {
  const config = getAlgoConfig(userId);
  const usePersonalization =
    config.enable_personalization && hasEnoughDataForPersonalization(userId);

  // Calculate individual scores
  const recency = calculateRecencyScore(article.published_at);
  const popularity = normalizePopularity(article.popularity_score);

  let source = 0.5;
  let topic = 0.5;
  let author = 0.5;

  if (usePersonalization) {
    source = getSourceWeight(article.source, userId);
    author = getAuthorWeight(article.author, userId);

    if (config.enable_topic_extraction && article.topics) {
      const articleTopics = JSON.parse(article.topics) as string[];
      topic = calculateTopicMatch(articleTopics, userId);
    }
  } else {
    // Cold start: use default source trust scores
    source = getDefaultSourceTrust(article.source);
  }

  // Weighted sum
  const personalizedScore =
    recency * config.weight_recency +
    popularity * config.weight_popularity +
    source * config.weight_source +
    topic * config.weight_topic +
    author * config.weight_author;

  return {
    ...article,
    personalizedScore,
    scoreBreakdown: {
      recency,
      popularity,
      source,
      topic,
      author,
    },
  };
}

/**
 * Default source trust scores (cold start)
 */
function getDefaultSourceTrust(source: string): number {
  const tier1 = ['ycombinator', 'nytimes', 'bbc', 'reuters', 'apnews'];
  const tier2 = ['techcrunch', 'verge', 'arstechnica', 'devto', 'medium'];

  if (tier1.includes(source.toLowerCase())) return 1.0;
  if (tier2.includes(source.toLowerCase())) return 0.8;
  return 0.5; // Unknown source
}

/**
 * Get ranked articles for a timeframe
 */
export function getRankedArticles(
  timeframeHours: number = 24,
  userId: number = 1,
  limit: number = 20
): RankedArticle[] {
  const db = getDb();

  // Get articles within timeframe
  const cutoff = new Date(Date.now() - timeframeHours * 60 * 60 * 1000)
    .toISOString();

  const articles = db
    .prepare(
      `SELECT * FROM articles
       WHERE published_at > ?
       ORDER BY published_at DESC
       LIMIT 200`
    )
    .all(cutoff) as Article[];

  // Calculate personalized scores
  const rankedArticles = articles.map((article) =>
    calculatePersonalizedScore(article, userId)
  );

  // Sort by score and return top N
  return rankedArticles
    .sort((a, b) => b.personalizedScore - a.personalizedScore)
    .slice(0, limit);
}

/**
 * Record article impression (shown in feed)
 */
export function recordImpression(articleId: number, userId: number = 1) {
  const db = getDb();

  db.prepare(
    `INSERT INTO article_engagement (article_id, user_id, impression_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(article_id, user_id)
     DO UPDATE SET impression_at = CURRENT_TIMESTAMP`
  ).run(articleId, userId);
}

/**
 * Record article click (user opened article)
 */
export function recordClick(articleId: number, userId: number = 1) {
  const db = getDb();

  db.prepare(
    `INSERT INTO article_engagement (article_id, user_id, clicked_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(article_id, user_id)
     DO UPDATE SET clicked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`
  ).run(articleId, userId);
}

/**
 * Record dwell time (how long user read)
 */
export function recordDwellTime(
  articleId: number,
  dwellTimeSeconds: number,
  userId: number = 1
) {
  const db = getDb();

  db.prepare(
    `UPDATE article_engagement
     SET dwell_time = ?, updated_at = CURRENT_TIMESTAMP
     WHERE article_id = ? AND user_id = ?`
  ).run(dwellTimeSeconds, articleId, userId);
}

/**
 * Record article rating (upvote/downvote)
 */
export function recordRating(
  articleId: number,
  rating: -1 | 0 | 1,
  userId: number = 1
) {
  const db = getDb();

  db.prepare(
    `INSERT INTO article_engagement (article_id, user_id, rating, rated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(article_id, user_id)
     DO UPDATE SET rating = ?, rated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`
  ).run(articleId, userId, rating, rating);

  // Trigger immediate weight update for this source
  updateSourceWeightsForArticle(articleId, userId);
}

/**
 * Save article for later
 */
export function saveArticle(articleId: number, note?: string, userId: number = 1) {
  const db = getDb();

  db.prepare(
    `INSERT INTO article_engagement (article_id, user_id, saved)
     VALUES (?, ?, TRUE)
     ON CONFLICT(article_id, user_id)
     DO UPDATE SET saved = TRUE, updated_at = CURRENT_TIMESTAMP`
  ).run(articleId, userId);

  // Also add to saved_articles table
  db.prepare(
    `INSERT OR IGNORE INTO saved_articles (article_id, user_id, note)
     VALUES (?, ?, ?)`
  ).run(articleId, userId, note);
}

/**
 * Update source weights based on recent engagement
 * This runs daily or after significant events (ratings)
 */
function updateSourceWeightsForArticle(articleId: number, userId: number = 1) {
  const db = getDb();

  // Get article source
  const article = db
    .prepare('SELECT source FROM articles WHERE id = ?')
    .get(articleId) as { source: string };

  if (!article) return;

  updateSourceWeight(article.source, userId);
}

/**
 * Update weight for a specific source
 */
export function updateSourceWeight(source: string, userId: number = 1) {
  const db = getDb();

  // Calculate engagement metrics for this source
  const metrics = db
    .prepare(
      `SELECT
        COUNT(*) as impressions,
        SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicks,
        SUM(COALESCE(dwell_time, 0)) as total_dwell_time,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as upvotes,
        SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as downvotes
      FROM article_engagement ae
      JOIN articles a ON ae.article_id = a.id
      WHERE a.source = ? AND ae.user_id = ?`
    )
    .get(source, userId) as {
    impressions: number;
    clicks: number;
    total_dwell_time: number;
    upvotes: number;
    downvotes: number;
  };

  if (metrics.impressions === 0) return;

  // Calculate engagement rate (CTR)
  const ctr = metrics.clicks / metrics.impressions;

  // Calculate average dwell time (normalize to 0-1, 180s = ideal)
  const avgDwellTime = metrics.clicks > 0 ? metrics.total_dwell_time / metrics.clicks : 0;
  const dwellScore = Math.min(avgDwellTime / 180, 1.0);

  // Calculate rating score (-1 to +1)
  const totalRatings = metrics.upvotes + metrics.downvotes;
  const ratingScore =
    totalRatings > 0 ? (metrics.upvotes - metrics.downvotes) / totalRatings : 0;

  // Combined weight (0 to 1)
  const newWeight = ctr * 0.4 + dwellScore * 0.3 + (ratingScore + 1) / 2 * 0.3;

  // Get old weight for smoothing
  const oldWeightRow = db
    .prepare('SELECT weight FROM source_weights WHERE source = ? AND user_id = ?')
    .get(source, userId) as { weight: number } | undefined;

  const oldWeight = oldWeightRow?.weight ?? 0.5;

  // Smooth update (70% old, 30% new)
  const finalWeight = oldWeight * 0.7 + newWeight * 0.3;

  // Upsert source weight
  db.prepare(
    `INSERT INTO source_weights (source, user_id, impressions, clicks, total_dwell_time, upvotes, downvotes, weight, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(source, user_id)
     DO UPDATE SET
       impressions = ?,
       clicks = ?,
       total_dwell_time = ?,
       upvotes = ?,
       downvotes = ?,
       weight = ?,
       updated_at = CURRENT_TIMESTAMP`
  ).run(
    source,
    userId,
    metrics.impressions,
    metrics.clicks,
    metrics.total_dwell_time,
    metrics.upvotes,
    metrics.downvotes,
    finalWeight,
    metrics.impressions,
    metrics.clicks,
    metrics.total_dwell_time,
    metrics.upvotes,
    metrics.downvotes,
    finalWeight
  );
}

/**
 * Update all source weights (run daily)
 */
export function updateAllSourceWeights(userId: number = 1) {
  const db = getDb();

  const sources = db
    .prepare('SELECT DISTINCT source FROM articles')
    .all() as { source: string }[];

  for (const { source } of sources) {
    updateSourceWeight(source, userId);
  }

  console.log(`✅ Updated ${sources.length} source weights`);
}
