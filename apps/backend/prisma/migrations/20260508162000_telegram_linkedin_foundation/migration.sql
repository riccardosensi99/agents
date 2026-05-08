-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('linkedin');

-- CreateEnum
CREATE TYPE "PublishingStatus" AS ENUM ('pending_manual', 'blocked', 'published', 'failed');

-- CreateTable
CREATE TABLE "TelegramApprovalAction" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "callbackId" TEXT NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "message" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramApprovalAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountExternalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disabled',
    "tokenMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishingAttempt" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "status" "PublishingStatus" NOT NULL DEFAULT 'pending_manual',
    "payload" JSONB,
    "error" TEXT,
    "requestedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramApprovalAction_callbackId_key" ON "TelegramApprovalAction"("callbackId");

-- CreateIndex
CREATE INDEX "TelegramApprovalAction_draftId_idx" ON "TelegramApprovalAction"("draftId");

-- CreateIndex
CREATE INDEX "TelegramApprovalAction_status_idx" ON "TelegramApprovalAction"("status");

-- CreateIndex
CREATE INDEX "SocialAccount_provider_idx" ON "SocialAccount"("provider");

-- CreateIndex
CREATE INDEX "SocialAccount_status_idx" ON "SocialAccount"("status");

-- CreateIndex
CREATE INDEX "PublishingAttempt_draftId_idx" ON "PublishingAttempt"("draftId");

-- CreateIndex
CREATE INDEX "PublishingAttempt_provider_idx" ON "PublishingAttempt"("provider");

-- CreateIndex
CREATE INDEX "PublishingAttempt_status_idx" ON "PublishingAttempt"("status");

-- AddForeignKey
ALTER TABLE "TelegramApprovalAction" ADD CONSTRAINT "TelegramApprovalAction_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishingAttempt" ADD CONSTRAINT "PublishingAttempt_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
