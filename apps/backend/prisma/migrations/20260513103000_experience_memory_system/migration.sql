-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM (
    'EXPERIENCE',
    'OPINION',
    'LESSON',
    'WORKFLOW',
    'STACK',
    'CLIENT_CASE',
    'MISTAKE',
    'DEPLOY',
    'CONTENT_EXAMPLE'
);

-- CreateTable
CREATE TABLE "MemoryEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MemoryType" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "importance" INTEGER NOT NULL DEFAULT 3,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemoryEntry_type_idx" ON "MemoryEntry"("type");

-- CreateIndex
CREATE INDEX "MemoryEntry_importance_idx" ON "MemoryEntry"("importance");

-- CreateIndex
CREATE INDEX "MemoryEntry_createdAt_idx" ON "MemoryEntry"("createdAt");
