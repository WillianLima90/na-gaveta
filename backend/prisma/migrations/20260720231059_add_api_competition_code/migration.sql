/*
  Warnings:

  - A unique constraint covering the columns `[api_competition_code]` on the table `championships` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "championships" ADD COLUMN     "api_competition_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "championships_api_competition_code_key" ON "championships"("api_competition_code");

-- Configure active competitions used by football-data.org
UPDATE "championships"
SET "api_competition_code" = 'BSA'
WHERE "slug" = 'brasileirao-serie-a-real'
  AND "api_competition_code" IS NULL;

UPDATE "championships"
SET "api_competition_code" = 'WC'
WHERE "slug" = 'copa-do-mundo-fifa-2026'
  AND "api_competition_code" IS NULL;
