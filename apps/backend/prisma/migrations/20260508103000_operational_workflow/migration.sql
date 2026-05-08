ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'revision_requested';

CREATE TYPE "TaskPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

ALTER TABLE "Task"
  ADD COLUMN "platform" "Platform" NOT NULL DEFAULT 'internal',
  ADD COLUMN "priority" "TaskPriority" NOT NULL DEFAULT 'normal',
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "failedAt" TIMESTAMP(3),
  ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "resultJson" JSONB,
  ADD COLUMN "errorMessage" TEXT;

UPDATE "Task"
SET "platform" = CASE
  WHEN "Agent"."slug" = 'instaspark' THEN 'instagram'::"Platform"
  WHEN "Agent"."slug" = 'linkforge' THEN 'linkedin'::"Platform"
  ELSE 'internal'::"Platform"
END
FROM "Agent"
WHERE "Task"."agentId" = "Agent"."id";

ALTER TABLE "Draft"
  ADD COLUMN "currentVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "DraftVersion" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "supervisorScore" INTEGER,
  "riskLevel" "RiskLevel",
  "supervisorFeedback" TEXT,
  "recommendedAction" "RecommendedAction",
  "userFeedback" TEXT,
  "createdBy" TEXT NOT NULL DEFAULT 'system',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DraftVersion_pkey" PRIMARY KEY ("id")
);

INSERT INTO "DraftVersion" (
  "id",
  "draftId",
  "version",
  "title",
  "content",
  "supervisorScore",
  "riskLevel",
  "supervisorFeedback",
  "recommendedAction",
  "createdBy",
  "createdAt"
)
SELECT
  "id" || '-v1',
  "id",
  1,
  "title",
  "content",
  "supervisorScore",
  "riskLevel",
  "supervisorFeedback",
  "recommendedAction",
  'migration',
  "createdAt"
FROM "Draft";

CREATE TABLE "TaskEvent" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ownerName" TEXT NOT NULL DEFAULT '',
  "bio" TEXT NOT NULL DEFAULT '',
  "services" TEXT NOT NULL DEFAULT '',
  "technicalStack" TEXT NOT NULL DEFAULT '',
  "toneOfVoice" TEXT NOT NULL DEFAULT '',
  "targetClients" TEXT NOT NULL DEFAULT '',
  "businessGoals" TEXT NOT NULL DEFAULT '',
  "topicsToPush" TEXT NOT NULL DEFAULT '',
  "topicsToAvoid" TEXT NOT NULL DEFAULT '',
  "goodPostExamples" TEXT NOT NULL DEFAULT '',
  "bannedWords" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'unread',
  "meta" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DraftVersion_draftId_version_key" ON "DraftVersion"("draftId", "version");
CREATE INDEX "DraftVersion_draftId_idx" ON "DraftVersion"("draftId");
CREATE INDEX "TaskEvent_taskId_idx" ON "TaskEvent"("taskId");
CREATE INDEX "TaskEvent_type_idx" ON "TaskEvent"("type");
CREATE UNIQUE INDEX "BrandProfile_userId_key" ON "BrandProfile"("userId");
CREATE INDEX "Notification_status_idx" ON "Notification"("status");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE INDEX "Task_platform_idx" ON "Task"("platform");
CREATE INDEX "Task_scheduledAt_idx" ON "Task"("scheduledAt");

ALTER TABLE "DraftVersion" ADD CONSTRAINT "DraftVersion_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
