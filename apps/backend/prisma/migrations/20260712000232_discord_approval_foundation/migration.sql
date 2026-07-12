-- CreateTable
CREATE TABLE "DiscordApprovalAction" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "callbackId" TEXT NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "message" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordApprovalAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscordApprovalAction_callbackId_key" ON "DiscordApprovalAction"("callbackId");

-- CreateIndex
CREATE INDEX "DiscordApprovalAction_draftId_idx" ON "DiscordApprovalAction"("draftId");

-- CreateIndex
CREATE INDEX "DiscordApprovalAction_status_idx" ON "DiscordApprovalAction"("status");

-- AddForeignKey
ALTER TABLE "DiscordApprovalAction" ADD CONSTRAINT "DiscordApprovalAction_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
