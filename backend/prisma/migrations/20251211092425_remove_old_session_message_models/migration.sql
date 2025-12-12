/*
  Warnings:

  - You are about to drop the `messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_createdBy_fkey";

-- DropTable
DROP TABLE "messages";

-- DropTable
DROP TABLE "sessions";
