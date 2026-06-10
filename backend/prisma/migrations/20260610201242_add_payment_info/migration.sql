-- AlterTable
ALTER TABLE "pools" ADD COLUMN     "payment_description" TEXT,
ADD COLUMN     "payment_updated_at" TIMESTAMP(3);
