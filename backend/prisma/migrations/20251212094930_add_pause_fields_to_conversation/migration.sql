-- AlterTable
ALTER TABLE "conversation_sessions" ADD COLUMN     "pausedBy" TEXT,
ADD COLUMN     "pausedUntil" TIMESTAMP(3);
