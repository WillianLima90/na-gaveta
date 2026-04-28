-- CreateTable
CREATE TABLE "match_result_history" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "prevHome" INTEGER,
    "prevAway" INTEGER,
    "newHome" INTEGER NOT NULL,
    "newAway" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_result_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "match_result_history" ADD CONSTRAINT "match_result_history_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
