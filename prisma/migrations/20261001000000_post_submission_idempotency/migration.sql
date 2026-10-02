-- Nullable columns leave existing posts and automated thread creation unchanged.
BEGIN;
ALTER TABLE "スレッド" ADD COLUMN "submissionKey" TEXT, ADD COLUMN "submissionHash" TEXT;
ALTER TABLE "投稿" ADD COLUMN "submissionKey" TEXT, ADD COLUMN "submissionHash" TEXT;
CREATE UNIQUE INDEX "スレッド_submissionKey_key" ON "スレッド"("submissionKey");
CREATE UNIQUE INDEX "投稿_submissionKey_key" ON "投稿"("submissionKey");
COMMIT;
