-- CreateIndex
CREATE INDEX "article_topics_articleId_relevance_idx" ON "article_topics"("articleId", "relevance");

-- CreateIndex
CREATE INDEX "article_topics_articleId_topicId_relevance_idx" ON "article_topics"("articleId", "topicId", "relevance");

-- CreateIndex
CREATE INDEX "articles_source_idx" ON "articles"("source");

-- CreateIndex
CREATE INDEX "articles_publishedAt_source_idx" ON "articles"("publishedAt", "source");

-- CreateIndex
CREATE INDEX "articles_publishedAt_score_source_idx" ON "articles"("publishedAt", "score", "source");

-- CreateIndex
CREATE INDEX "user_activities_action_timestamp_articleId_idx" ON "user_activities"("action", "timestamp", "articleId");
