-- AlterTable
ALTER TABLE "users" ADD COLUMN     "favorite_team" TEXT;

-- CreateTable
CREATE TABLE "round_winners" (
    "id" TEXT NOT NULL,
    "pool_id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "favorite_team" TEXT,
    "round_points" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "round_winners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "round_winners_pool_id_round_id_user_id_key" ON "round_winners"("pool_id", "round_id", "user_id");

-- AddForeignKey
ALTER TABLE "round_winners" ADD CONSTRAINT "round_winners_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_winners" ADD CONSTRAINT "round_winners_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_winners" ADD CONSTRAINT "round_winners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
