-- CreateTable
CREATE TABLE "thoughts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "category" TEXT,
    "articleId" TEXT,
    "userId" TEXT NOT NULL DEFAULT 'default-user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "thoughts_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "thoughts_createdAt_idx" ON "thoughts"("createdAt");

-- CreateIndex
CREATE INDEX "thoughts_category_idx" ON "thoughts"("category");

-- CreateIndex
CREATE INDEX "thoughts_articleId_idx" ON "thoughts"("articleId");

-- CreateIndex
CREATE INDEX "thoughts_category_createdAt_idx" ON "thoughts"("category", "createdAt");
