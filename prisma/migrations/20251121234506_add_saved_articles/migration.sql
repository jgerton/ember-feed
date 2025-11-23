-- CreateTable
CREATE TABLE "saved_articles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "savedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "saved_articles_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "saved_articles_articleId_key" ON "saved_articles"("articleId");

-- CreateIndex
CREATE INDEX "saved_articles_articleId_idx" ON "saved_articles"("articleId");

-- CreateIndex
CREATE INDEX "saved_articles_priority_savedAt_idx" ON "saved_articles"("priority", "savedAt");

-- CreateIndex
CREATE INDEX "saved_articles_isRead_idx" ON "saved_articles"("isRead");
