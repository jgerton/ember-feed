-- CreateIndex
CREATE INDEX "user_activities_action_idx" ON "user_activities"("action");

-- CreateIndex
CREATE INDEX "user_activities_action_timestamp_idx" ON "user_activities"("action", "timestamp");
