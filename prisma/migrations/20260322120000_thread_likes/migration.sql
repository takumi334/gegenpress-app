-- CreateTable
CREATE TABLE "thread_likes" (
    "id" SERIAL NOT NULL,
    "threadId" INTEGER NOT NULL,
    "anonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "thread_likes_threadId_anonId_key" ON "thread_likes"("threadId", "anonId");

-- CreateIndex
CREATE INDEX "thread_likes_threadId_idx" ON "thread_likes"("threadId");

-- AddForeignKey
ALTER TABLE "thread_likes" ADD CONSTRAINT "thread_likes_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "スレッド"("id") ON DELETE CASCADE ON UPDATE CASCADE;
