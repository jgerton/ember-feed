-- CreateTable
CREATE TABLE "rss_feeds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastSuccessAt" DATETIME,
    "lastFailureAt" DATETIME,
    "lastErrorMessage" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "rss_feeds_url_key" ON "rss_feeds"("url");

-- CreateIndex
CREATE INDEX "rss_feeds_status_idx" ON "rss_feeds"("status");
