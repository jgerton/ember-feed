-- CreateIndex
CREATE INDEX "saved_articles_isRead_priority_savedAt_idx" ON "saved_articles"("isRead", "priority", "savedAt");

-- CreateIndex
CREATE INDEX "todos_completed_idx" ON "todos"("completed");

-- CreateIndex
CREATE INDEX "todos_completed_createdAt_idx" ON "todos"("completed", "createdAt");
