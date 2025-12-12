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
          orderBy: { createdAt: "desc" },
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
    } else {
      // Reverter a ordem para manter ordem cronológica (mais antiga primeiro)
      session.messages.reverse();
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

  /**
   * Pausa o chatbot para uma conversa específica por X horas
   */
  async pauseConversation(
    phoneNumber: string,
    hours: number = 2,
    reason: string = "HUMAN_INTERVENTION"
  ): Promise<void> {
    const pausedUntil = new Date();
    pausedUntil.setHours(pausedUntil.getHours() + hours);

    await prisma.conversationSession.upsert({
      where: { phoneNumber },
      update: {
        pausedUntil,
        pausedBy: reason,
      },
      create: {
        phoneNumber,
        state: ConversationState.INTRO,
        pausedUntil,
        pausedBy: reason,
      },
    });
  }

  /**
   * Remove a pausa de uma conversa
   */
  async unpauseConversation(phoneNumber: string): Promise<void> {
    await prisma.conversationSession.updateMany({
      where: { phoneNumber },
      data: {
        pausedUntil: null,
        pausedBy: null,
      },
    });
  }

  /**
   * Verifica se uma conversa está pausada
   */
  async isConversationPaused(phoneNumber: string): Promise<boolean> {
    const session = await prisma.conversationSession.findUnique({
      where: { phoneNumber },
      select: { pausedUntil: true },
    });

    if (!session || !session.pausedUntil) {
      return false;
    }

    // Verifica se a pausa ainda está ativa
    const now = new Date();
    if (now >= session.pausedUntil) {
      // Pausa expirou, remove automaticamente
      await this.unpauseConversation(phoneNumber);
      return false;
    }

    return true;
  }

  /**
   * Retorna o tempo restante de pausa em minutos
   */
  async getPauseTimeRemaining(phoneNumber: string): Promise<number | null> {
    const session = await prisma.conversationSession.findUnique({
      where: { phoneNumber },
      select: { pausedUntil: true },
    });

    if (!session || !session.pausedUntil) {
      return null;
    }

    const now = new Date();
    const remainingMs = session.pausedUntil.getTime() - now.getTime();
    
    if (remainingMs <= 0) {
      return null;
    }

    return Math.ceil(remainingMs / (1000 * 60)); // retorna em minutos
  }
}

