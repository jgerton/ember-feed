-- CreateTable
CREATE TABLE "todos" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSeconds" INTEGER,
    "scrollPercentage" INTEGER,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_entries" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'rss',
    "category" TEXT NOT NULL DEFAULT 'tech',
    "status" TEXT NOT NULL DEFAULT 'active',
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "updateFrequency" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFetched" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_topics" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "relevance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_articles" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "saved_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "diversityLevel" TEXT NOT NULL DEFAULT 'medium',
    "newsApiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "newsApiCategories" TEXT NOT NULL DEFAULT 'technology,science,business',
    "newsApiLanguage" TEXT NOT NULL DEFAULT 'en',
    "newsApiCountry" TEXT NOT NULL DEFAULT 'us',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thoughts" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT,
    "categoryFields" JSONB,
    "articleId" TEXT,
    "userId" TEXT NOT NULL DEFAULT 'default-user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thoughts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_feed_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'default-user',
    "feedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_feed_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hot_topics" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "mentions" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "sources" TEXT NOT NULL,
    "sampleUrls" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hot_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trending_up_topics" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "velocity" DOUBLE PRECISION NOT NULL,
    "currentVolume" INTEGER NOT NULL,
    "previousVolume" INTEGER NOT NULL,
    "percentGrowth" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "sources" TEXT NOT NULL,
    "sampleUrls" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trending_up_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyword_history" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "mentions" INTEGER NOT NULL,
    "sources" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keyword_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "todos_completed_idx" ON "todos"("completed");

-- CreateIndex
CREATE INDEX "todos_completed_createdAt_idx" ON "todos"("completed", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "articles_url_key" ON "articles"("url");

-- CreateIndex
CREATE INDEX "articles_publishedAt_idx" ON "articles"("publishedAt");

-- CreateIndex
CREATE INDEX "articles_score_idx" ON "articles"("score");

-- CreateIndex
CREATE INDEX "articles_score_publishedAt_idx" ON "articles"("score", "publishedAt");

-- CreateIndex
CREATE INDEX "articles_source_idx" ON "articles"("source");

-- CreateIndex
CREATE INDEX "articles_publishedAt_source_idx" ON "articles"("publishedAt", "source");

-- CreateIndex
CREATE INDEX "articles_publishedAt_score_source_idx" ON "articles"("publishedAt", "score", "source");

-- CreateIndex
CREATE INDEX "user_activities_articleId_idx" ON "user_activities"("articleId");

-- CreateIndex
CREATE INDEX "user_activities_timestamp_idx" ON "user_activities"("timestamp");

-- CreateIndex
CREATE INDEX "user_activities_action_idx" ON "user_activities"("action");

-- CreateIndex
CREATE INDEX "user_activities_articleId_timestamp_idx" ON "user_activities"("articleId", "timestamp");

-- CreateIndex
CREATE INDEX "user_activities_action_timestamp_idx" ON "user_activities"("action", "timestamp");

-- CreateIndex
CREATE INDEX "user_activities_action_timestamp_articleId_idx" ON "user_activities"("action", "timestamp", "articleId");

-- CreateIndex
CREATE INDEX "log_entries_type_idx" ON "log_entries"("type");

-- CreateIndex
CREATE INDEX "log_entries_createdAt_idx" ON "log_entries"("createdAt");

-- CreateIndex
CREATE INDEX "log_entries_type_createdAt_idx" ON "log_entries"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "feeds_url_key" ON "feeds"("url");

-- CreateIndex
CREATE INDEX "feeds_status_idx" ON "feeds"("status");

-- CreateIndex
CREATE INDEX "feeds_enabled_idx" ON "feeds"("enabled");

-- CreateIndex
CREATE INDEX "feeds_type_idx" ON "feeds"("type");

-- CreateIndex
CREATE INDEX "feeds_category_idx" ON "feeds"("category");

-- CreateIndex
CREATE INDEX "feeds_enabled_status_idx" ON "feeds"("enabled", "status");

-- CreateIndex
CREATE UNIQUE INDEX "topics_name_key" ON "topics"("name");

-- CreateIndex
CREATE UNIQUE INDEX "topics_slug_key" ON "topics"("slug");

-- CreateIndex
CREATE INDEX "topics_slug_idx" ON "topics"("slug");

-- CreateIndex
CREATE INDEX "article_topics_articleId_idx" ON "article_topics"("articleId");

-- CreateIndex
CREATE INDEX "article_topics_topicId_idx" ON "article_topics"("topicId");

-- CreateIndex
CREATE INDEX "article_topics_topicId_relevance_idx" ON "article_topics"("topicId", "relevance");

-- CreateIndex
CREATE INDEX "article_topics_articleId_relevance_idx" ON "article_topics"("articleId", "relevance");

-- CreateIndex
CREATE INDEX "article_topics_articleId_topicId_relevance_idx" ON "article_topics"("articleId", "topicId", "relevance");

-- CreateIndex
CREATE UNIQUE INDEX "article_topics_articleId_topicId_key" ON "article_topics"("articleId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_articles_articleId_key" ON "saved_articles"("articleId");

-- CreateIndex
CREATE INDEX "saved_articles_articleId_idx" ON "saved_articles"("articleId");

-- CreateIndex
CREATE INDEX "saved_articles_priority_savedAt_idx" ON "saved_articles"("priority", "savedAt");

-- CreateIndex
CREATE INDEX "saved_articles_isRead_idx" ON "saved_articles"("isRead");

-- CreateIndex
CREATE INDEX "saved_articles_isRead_priority_savedAt_idx" ON "saved_articles"("isRead", "priority", "savedAt");

-- CreateIndex
CREATE INDEX "thoughts_createdAt_idx" ON "thoughts"("createdAt");

-- CreateIndex
CREATE INDEX "thoughts_category_idx" ON "thoughts"("category");

-- CreateIndex
CREATE INDEX "thoughts_articleId_idx" ON "thoughts"("articleId");

-- CreateIndex
CREATE INDEX "thoughts_category_createdAt_idx" ON "thoughts"("category", "createdAt");

-- CreateIndex
CREATE INDEX "user_feed_subscriptions_userId_idx" ON "user_feed_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "user_feed_subscriptions_feedId_idx" ON "user_feed_subscriptions"("feedId");

-- CreateIndex
CREATE UNIQUE INDEX "user_feed_subscriptions_userId_feedId_key" ON "user_feed_subscriptions"("userId", "feedId");

-- CreateIndex
CREATE INDEX "hot_topics_timeframe_rank_fetchedAt_idx" ON "hot_topics"("timeframe", "rank", "fetchedAt");

-- CreateIndex
CREATE INDEX "hot_topics_fetchedAt_idx" ON "hot_topics"("fetchedAt");

-- CreateIndex
CREATE INDEX "hot_topics_keyword_timeframe_idx" ON "hot_topics"("keyword", "timeframe");

-- CreateIndex
CREATE UNIQUE INDEX "hot_topics_keyword_timeframe_fetchedAt_key" ON "hot_topics"("keyword", "timeframe", "fetchedAt");

-- CreateIndex
CREATE INDEX "trending_up_topics_timeframe_rank_fetchedAt_idx" ON "trending_up_topics"("timeframe", "rank", "fetchedAt");

-- CreateIndex
CREATE INDEX "trending_up_topics_fetchedAt_idx" ON "trending_up_topics"("fetchedAt");

-- CreateIndex
CREATE INDEX "trending_up_topics_keyword_timeframe_idx" ON "trending_up_topics"("keyword", "timeframe");

-- CreateIndex
CREATE UNIQUE INDEX "trending_up_topics_keyword_timeframe_fetchedAt_key" ON "trending_up_topics"("keyword", "timeframe", "fetchedAt");

-- CreateIndex
CREATE INDEX "keyword_history_keyword_date_idx" ON "keyword_history"("keyword", "date");

-- CreateIndex
CREATE INDEX "keyword_history_date_idx" ON "keyword_history"("date");

-- CreateIndex
CREATE INDEX "keyword_history_keyword_idx" ON "keyword_history"("keyword");

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_topics" ADD CONSTRAINT "article_topics_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_topics" ADD CONSTRAINT "article_topics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_articles" ADD CONSTRAINT "saved_articles_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thoughts" ADD CONSTRAINT "thoughts_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feed_subscriptions" ADD CONSTRAINT "user_feed_subscriptions_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
