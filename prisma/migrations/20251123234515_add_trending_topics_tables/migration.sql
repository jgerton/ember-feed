-- CreateTable
CREATE TABLE "feed_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "updateFrequency" INTEGER NOT NULL DEFAULT 60,
    "lastFetched" DATETIME,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_feed_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT 'default-user',
    "feedSourceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_feed_subscriptions_feedSourceId_fkey" FOREIGN KEY ("feedSourceId") REFERENCES "feed_sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "hot_topics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" REAL NOT NULL,
    "mentions" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "sources" TEXT NOT NULL,
    "sampleUrls" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "trending_up_topics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "velocity" REAL NOT NULL,
    "currentVolume" INTEGER NOT NULL,
    "previousVolume" INTEGER NOT NULL,
    "percentGrowth" REAL NOT NULL,
    "summary" TEXT NOT NULL,
    "sources" TEXT NOT NULL,
    "sampleUrls" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "keyword_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "mentions" INTEGER NOT NULL,
    "sources" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "feed_sources_url_key" ON "feed_sources"("url");

-- CreateIndex
CREATE INDEX "feed_sources_category_idx" ON "feed_sources"("category");

-- CreateIndex
CREATE INDEX "feed_sources_enabled_idx" ON "feed_sources"("enabled");

-- CreateIndex
CREATE INDEX "feed_sources_type_idx" ON "feed_sources"("type");

-- CreateIndex
CREATE INDEX "feed_sources_enabled_updateFrequency_idx" ON "feed_sources"("enabled", "updateFrequency");

-- CreateIndex
CREATE INDEX "user_feed_subscriptions_userId_idx" ON "user_feed_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "user_feed_subscriptions_feedSourceId_idx" ON "user_feed_subscriptions"("feedSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "user_feed_subscriptions_userId_feedSourceId_key" ON "user_feed_subscriptions"("userId", "feedSourceId");

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
