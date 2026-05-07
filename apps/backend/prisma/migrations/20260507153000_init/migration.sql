CREATE TYPE "AgentStatus" AS ENUM ('idle', 'working', 'waiting_approval', 'error');
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'running', 'completed', 'waiting_approval', 'rejected', 'failed');
CREATE TYPE "DraftStatus" AS ENUM ('draft', 'waiting_approval', 'approved', 'rejected', 'revision_requested');
CREATE TYPE "Platform" AS ENUM ('instagram', 'linkedin', 'internal');
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "RecommendedAction" AS ENUM ('approve', 'revise', 'reject');
CREATE TYPE "ApprovalAction" AS ENUM ('approve', 'reject', 'request_revision', 'edit');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'owner',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Agent" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "AgentStatus" NOT NULL DEFAULT 'idle',
  "avatarType" TEXT NOT NULL,
  "config" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Task" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'pending',
  "result" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Draft" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "taskId" TEXT,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "platform" "Platform" NOT NULL,
  "status" "DraftStatus" NOT NULL DEFAULT 'waiting_approval',
  "supervisorScore" INTEGER,
  "riskLevel" "RiskLevel",
  "supervisorFeedback" TEXT,
  "recommendedAction" "RecommendedAction",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentLog" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'info',
  "message" TEXT NOT NULL,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Approval" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "userId" TEXT,
  "action" "ApprovalAction" NOT NULL,
  "comment" TEXT,
  "previousStatus" "DraftStatus",
  "newStatus" "DraftStatus",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemEvent" (
  "id" TEXT NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'info',
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Agent_slug_key" ON "Agent"("slug");
CREATE INDEX "Task_agentId_idx" ON "Task"("agentId");
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE INDEX "Draft_agentId_idx" ON "Draft"("agentId");
CREATE INDEX "Draft_taskId_idx" ON "Draft"("taskId");
CREATE INDEX "Draft_status_idx" ON "Draft"("status");
CREATE INDEX "AgentLog_agentId_idx" ON "AgentLog"("agentId");
CREATE INDEX "Approval_draftId_idx" ON "Approval"("draftId");
CREATE INDEX "Approval_userId_idx" ON "Approval"("userId");
CREATE INDEX "SystemEvent_type_idx" ON "SystemEvent"("type");

ALTER TABLE "Task" ADD CONSTRAINT "Task_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentLog" ADD CONSTRAINT "AgentLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
