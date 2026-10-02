CREATE INDEX IF NOT EXISTS "スレッド_teamId_deletedAt_createdAt_idx"
ON "スレッド"("teamId", "deletedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "Report_createdAt_idx"
ON "Report"("createdAt");

CREATE INDEX IF NOT EXISTS "Report_kind_targetId_idx"
ON "Report"("kind", "targetId");
