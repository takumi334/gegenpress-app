-- CreateTable
CREATE TABLE "prediction_cache" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "matchId" INTEGER,
    "homeTeamId" INTEGER,
    "awayTeamId" INTEGER,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "errorNote" TEXT,

    CONSTRAINT "prediction_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prediction_cache_teamId_idx" ON "prediction_cache"("teamId");

-- CreateIndex
CREATE INDEX "prediction_cache_expiresAt_idx" ON "prediction_cache"("expiresAt");
