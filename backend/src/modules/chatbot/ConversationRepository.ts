import {
  PrismaClient,
  Prisma,
  ConversationRole,
  ConversationSession,
  ConversationMessage,
  ConversationState,
} from "@prisma/client";

export type ConversationWithMessages = ConversationSession & {
  messages: ConversationMessage[];
};

const prisma = new PrismaClient();

export class ConversationRepository {
  async findOrCreateByPhone(
    phoneNumber: string
  ): Promise<ConversationWithMessages> {
    let session = await prisma.conversationSession.findUnique({
      where: { phoneNumber },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 20,
        },
      },
    });

    if (!session) {
      session = await prisma.conversationSession.create({
        data: {
          phoneNumber,
          state: ConversationState.INTRO,
        },
        include: { messages: true },
      });
    }

    return session;
  }

  async updateSession(
    sessionId: string,
    data: Prisma.ConversationSessionUpdateInput
  ): Promise<void> {
    await prisma.conversationSession.update({
      where: { id: sessionId },
      data,
    });
  }

  async appendMessage(
    conversationId: string,
    role: ConversationRole,
    content: string
  ): Promise<void> {
    await prisma.conversationMessage.create({
      data: {
        conversationId,
        role,
        content,
      },
    });
  }

  async clearConversation(phoneNumber: string): Promise<void> {
    await prisma.conversationSession.deleteMany({
      where: { phoneNumber },
    });
  }
}

