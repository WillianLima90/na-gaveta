-- CreateEnum
CREATE TYPE "CrmLeadType" AS ENUM ('ORGANIZER', 'COMPANY', 'PARTNER', 'SPONSOR');

-- CreateEnum
CREATE TYPE "CrmLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'PROPOSAL_SENT', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "crm_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "type" "CrmLeadType" NOT NULL DEFAULT 'ORGANIZER',
    "status" "CrmLeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "notes" TEXT,
    "next_action" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_leads_status_type_idx" ON "crm_leads"("status", "type");

-- CreateIndex
CREATE INDEX "crm_leads_created_at_idx" ON "crm_leads"("created_at");
