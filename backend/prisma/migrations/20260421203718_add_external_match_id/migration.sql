/*
  Warnings:

  - A unique constraint covering the columns `[external_match_id]` on the table `matches` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "external_match_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "matches_external_match_id_key" ON "matches"("external_match_id");
