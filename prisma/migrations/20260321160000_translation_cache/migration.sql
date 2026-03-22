-- CreateTable
CREATE TABLE "translation_cache" (
    "id" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "translated" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "translation_cache_targetLang_idx" ON "translation_cache"("targetLang");
