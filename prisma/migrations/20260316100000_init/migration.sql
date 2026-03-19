-- CreateTable
CREATE TABLE "スレッド" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "threadType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "スレッド_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tactics_boards" (
    "id" SERIAL NOT NULL,
    "threadId" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "title" TEXT DEFAULT '',
    "body" TEXT DEFAULT '',
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tactics_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_thread_jobs" (
    "id" SERIAL NOT NULL,
    "externalMatchId" INTEGER NOT NULL,
    "competitionCode" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "kickoffAt" TIMESTAMP(3) NOT NULL,
    "threadId" INTEGER,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_thread_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "投稿" (
    "id" SERIAL NOT NULL,
    "threadId" INTEGER NOT NULL,
    "author" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "投稿_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "anonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "reason" TEXT,
    "detail" TEXT,
    "pageUrl" TEXT,
    "ua" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_posts" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "fixtureId" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "runAt" TIMESTAMP(3) NOT NULL,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "positionCategory" TEXT NOT NULL,
    "teamName" TEXT,
    "shirtNumber" INTEGER,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predicted_lineups" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "threadId" INTEGER,
    "formation" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "predicted_lineups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predicted_lineup_players" (
    "id" SERIAL NOT NULL,
    "lineupId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "positionCode" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predicted_lineup_players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tactics_boards_threadId_idx" ON "tactics_boards"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "auto_thread_jobs_externalMatchId_key" ON "auto_thread_jobs"("externalMatchId");

-- CreateIndex
CREATE UNIQUE INDEX "auto_thread_jobs_threadId_key" ON "auto_thread_jobs"("threadId");

-- CreateIndex
CREATE INDEX "auto_thread_jobs_externalMatchId_idx" ON "auto_thread_jobs"("externalMatchId");

-- CreateIndex
CREATE INDEX "auto_thread_jobs_kickoffAt_idx" ON "auto_thread_jobs"("kickoffAt");

-- CreateIndex
CREATE INDEX "投稿_threadId_createdAt_idx" ON "投稿"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "post_likes_postId_idx" ON "post_likes"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_postId_anonId_key" ON "post_likes"("postId", "anonId");

-- CreateIndex
CREATE INDEX "scheduled_posts_runAt_idx" ON "scheduled_posts"("runAt");

-- CreateIndex
CREATE INDEX "scheduled_posts_postedAt_idx" ON "scheduled_posts"("postedAt");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_posts_teamId_fixtureId_type_key" ON "scheduled_posts"("teamId", "fixtureId", "type");

-- CreateIndex
CREATE INDEX "players_positionCategory_idx" ON "players"("positionCategory");

-- CreateIndex
CREATE INDEX "predicted_lineups_threadId_idx" ON "predicted_lineups"("threadId");

-- CreateIndex
CREATE INDEX "predicted_lineup_players_lineupId_idx" ON "predicted_lineup_players"("lineupId");

-- CreateIndex
CREATE UNIQUE INDEX "predicted_lineup_players_lineupId_playerId_key" ON "predicted_lineup_players"("lineupId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "predicted_lineup_players_lineupId_positionCode_key" ON "predicted_lineup_players"("lineupId", "positionCode");

-- AddForeignKey
ALTER TABLE "tactics_boards" ADD CONSTRAINT "tactics_boards_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "スレッド"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_thread_jobs" ADD CONSTRAINT "auto_thread_jobs_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "スレッド"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "投稿" ADD CONSTRAINT "投稿_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "スレッド"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "投稿"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predicted_lineups" ADD CONSTRAINT "predicted_lineups_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "スレッド"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predicted_lineup_players" ADD CONSTRAINT "predicted_lineup_players_lineupId_fkey" FOREIGN KEY ("lineupId") REFERENCES "predicted_lineups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predicted_lineup_players" ADD CONSTRAINT "predicted_lineup_players_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
