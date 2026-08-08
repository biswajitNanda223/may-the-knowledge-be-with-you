CREATE TYPE "TraceStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED');
CREATE TABLE "Conversation" (
  "id" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "GraphTrace" (
  "id" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "question" TEXT NOT NULL,
  "queryTemplate" TEXT NOT NULL,
  "nodeIds" TEXT[],
  "edgeIds" TEXT[],
  "elapsedMs" INTEGER NOT NULL,
  "status" "TraceStatus" NOT NULL DEFAULT 'STARTED',
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "GraphTrace_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GraphTrace_conversationId_createdAt_idx" ON "GraphTrace"("conversationId", "createdAt");
CREATE INDEX "GraphTrace_createdAt_idx" ON "GraphTrace"("createdAt");
ALTER TABLE "GraphTrace" ADD CONSTRAINT "GraphTrace_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
