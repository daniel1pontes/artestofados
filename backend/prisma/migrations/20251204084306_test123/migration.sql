-- CreateEnum
CREATE TYPE "ConversationState" AS ENUM ('INTRO', 'ASKING_NAME', 'ASKING_SERVICE', 'ASKING_APPOINTMENT_TYPE', 'ASKING_DATE', 'ASKING_TIME', 'CONFIRMING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('USER', 'BOT');

-- CreateTable
CREATE TABLE "conversation_sessions" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "clientName" TEXT,
    "serviceIntent" TEXT,
    "appointmentType" "AppointmentType",
    "state" "ConversationState" NOT NULL DEFAULT 'INTRO',
    "context" JSONB,
    "scheduledAppointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ConversationRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_sessions_phoneNumber_key" ON "conversation_sessions"("phoneNumber");

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
