-- tactics_boards テーブルのみ追加（既存テーブルは変更しない）
CREATE TABLE IF NOT EXISTS "tactics_boards" (
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

CREATE INDEX IF NOT EXISTS "tactics_boards_threadId_idx" ON "tactics_boards"("threadId");

ALTER TABLE "tactics_boards" DROP CONSTRAINT IF EXISTS "tactics_boards_threadId_fkey";
ALTER TABLE "tactics_boards" ADD CONSTRAINT "tactics_boards_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "スレッド"("id") ON DELETE CASCADE ON UPDATE CASCADE;
