-- CreateIndex
CREATE INDEX "articles_score_publishedAt_idx" ON "articles"("score", "publishedAt");

-- CreateIndex
CREATE INDEX "log_entries_type_createdAt_idx" ON "log_entries"("type", "createdAt");

-- CreateIndex
CREATE INDEX "user_activities_articleId_timestamp_idx" ON "user_activities"("articleId", "timestamp");
