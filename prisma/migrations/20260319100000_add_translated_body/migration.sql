-- AlterTable: add translatedBody to Thread (スレッド)
ALTER TABLE "スレッド" ADD COLUMN "translatedBody" TEXT;

-- AlterTable: add translatedBody to Post (投稿)
ALTER TABLE "投稿" ADD COLUMN "translatedBody" TEXT;
