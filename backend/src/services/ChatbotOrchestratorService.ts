import { ConversationState } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  NaturalLanguageEngine,
  IntentType,
  SlotData,
} from "../modules/chatbot/NaturalLanguageEngine";
import { ConversationRepository } from "../modules/chatbot/ConversationRepository";
import AppointmentService from "./AppointmentService";
import { DateTimeParser } from "../utils/DateTimeParser";
import { createLogger } from "../utils/logger";

const logger = createLogger("ChatbotOrchestratorService");

interface ChatbotResponse {
  message: string;
  intent: IntentType;
  appointmentCreated?: boolean;
  appointmentId?: string;
}

class ChatbotOrchestratorService {
  private nlpEngine: NaturalLanguageEngine;
  private conversationRepo: ConversationRepository;
  private appointmentService: AppointmentService;

  constructor() {
    this.nlpEngine = new NaturalLanguageEngine();
    this.conversationRepo = new ConversationRepository();
    this.appointmentService = new AppointmentService();
  }

  /**
   * Processa mensagem do usuário e retorna resposta com possível criação de agendamento
   */
  async processMessage(
    phoneNumber: string,
    userMessage: string,
  ): Promise<ChatbotResponse> {
    try {
      // Verificar se a conversa está pausada ANTES de processar
      const isPaused =
        await this.conversationRepo.isConversationPaused(phoneNumber);
      if (isPaused) {
        const remainingMinutes =
          await this.conversationRepo.getPauseTimeRemaining(phoneNumber);
        logger.info("Mensagem ignorada - conversa pausada", {
          phoneNumber,
          remainingMinutes,
        });
        // Retornar resposta vazia para não responder ao cliente
        throw new Error("CONVERSATION_PAUSED");
      }

      // Buscar ou criar sessão de conversa
      const session =
        await this.conversationRepo.findOrCreateByPhone(phoneNumber);

      // Interpretar mensagem usando NLP
      const interpretation = await this.nlpEngine.interpret(
        session,
        userMessage,
      );

      // Salvar mensagem do usuário
      await this.conversationRepo.appendMessage(
        session.id,
        "USER",
        userMessage,
      );

      // Processar baseado no intent
      let response: ChatbotResponse;

      switch (interpretation.intent) {
        case "CONFIRM_APPOINTMENT":
          response = await this.handleConfirmAppointment(
            session,
            interpretation.slots,
            interpretation.reply,
          );
          break;

        case "SCHEDULE_APPOINTMENT":
          response = await this.handleScheduleAppointment(
            session,
            interpretation.slots,
            interpretation.reply,
          );
          break;

        case "CANCEL_APPOINTMENT":
          response = await this.handleCancelAppointment(
            session,
            interpretation.slots,
            interpretation.reply,
          );
          break;

        case "RESCHEDULE_APPOINTMENT":
          response = await this.handleRescheduleAppointment(
            session,
            interpretation.slots,
            interpretation.reply,
          );
          break;

        case "CANCEL":
          response = await this.handleCancel(session, interpretation.reply);
          break;

        default:
          response = {
            message: interpretation.reply,
            intent: interpretation.intent,
          };
      }

      // Salvar resposta do bot
      await this.conversationRepo.appendMessage(
        session.id,
        "BOT",
        response.message,
      );

      // Atualizar estado da sessão se necessário
      await this.updateSessionState(session.id, interpretation);

      return response;
    } catch (error) {
      logger.error(
        "Erro ao processar mensagem",
        error instanceof Error ? error : new Error(String(error)),
        {
          phoneNumber,
          message: userMessage.substring(0, 100),
        },
      );

      return {
        message:
          "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
        intent: "SMALL_TALK",
      };
    }
  }

  /**
   * Lida com confirmação de agendamento e cria o agendamento se dados estiverem completos
   */
  private async handleConfirmAppointment(
    session: any,
    slots: SlotData,
    defaultReply: string,
  ): Promise<ChatbotResponse> {
    // Verificar se temos todos os dados necessários
    const hasAllData =
      slots.clientName &&
      slots.appointmentType &&
      slots.appointmentDate &&
      slots.appointmentTime &&
      slots.confirmation === "yes";

    if (!hasAllData) {
      return {
        message: defaultReply,
        intent: "CONFIRM_APPOINTMENT",
      };
    }

    try {
      // Parse de data e horário
      const startDateTime = this.parseAppointmentDateTime(
        slots.appointmentDate!,
        slots.appointmentTime!,
      );

      if (!startDateTime) {
        return {
          message:
            "Desculpe, não consegui entender a data ou horário. Pode informar novamente?",
          intent: "COLLECT_DATA",
        };
      }

      // Validar horário
      const validation = DateTimeParser.validateAppointmentSlot(startDateTime);
      if (!validation.isValid) {
        return {
          message: validation.message,
          intent: "COLLECT_DATA",
        };
      }

      // Verificar disponibilidade usando validação completa
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1);

      const availabilityValidation =
        await this.appointmentService.validateAppointment(
          startDateTime,
          endDateTime,
          slots.appointmentType as "ONLINE" | "IN_STORE",
        );

      if (!availabilityValidation.isValid) {
        return {
          message:
            availabilityValidation.message ||
            "Desculpe, este horário não está disponível. Pode escolher outro?",
          intent: "SCHEDULE_APPOINTMENT",
        };
      }

      // Obter userId do sistema (admin ou primeiro usuário disponível)
      const systemUser = await this.getSystemUserId();

      if (!systemUser) {
        logger.error(
          "Não foi possível encontrar usuário do sistema para criar agendamento",
        );
        return {
          message:
            "Desculpe, ocorreu um erro interno. Tente novamente mais tarde.",
          intent: "SMALL_TALK",
        };
      }

      // Criar agendamento
      const appointment = await this.appointmentService.createAppointment({
        clientName: slots.clientName!,
        clientPhone: session.phoneNumber,
        type: slots.appointmentType as "ONLINE" | "IN_STORE",
        start: startDateTime,
        end: endDateTime,
        userId: systemUser.id,
      });

      if (!appointment) {
        logger.error("Falha ao criar agendamento - retornou null");
        return {
          message:
            "Desculpe, ocorreu um erro ao criar seu agendamento. Tente novamente.",
          intent: "SCHEDULE_APPOINTMENT",
        };
      }

      // Atualizar sessão com ID do agendamento
      await this.conversationRepo.updateSession(session.id, {
        scheduledAppointmentId: appointment.id,
        state: ConversationState.COMPLETED,
      });

      const typeText =
        slots.appointmentType === "ONLINE" ? "online" : "na loja";
      const formattedDate = startDateTime.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const formattedTime = startDateTime.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const confirmationMessage =
        `✅ Agendamento confirmado!\n\n` +
        `📅 Data: ${formattedDate}\n` +
        `🕐 Horário: ${formattedTime}\n` +
        `📍 Tipo: ${typeText}\n\n` +
        (slots.appointmentType === "ONLINE"
          ? `🔗 Você receberá o link da reunião em breve.\n\n`
          : `📍 Endereço: Av. Almirante Barroso, 389, Centro – João Pessoa – PB\n\n`) +
        `Até breve! 😊`;

      logger.info("Agendamento criado via chatbot", {
        appointmentId: appointment.id,
        clientName: slots.clientName,
        phoneNumber: session.phoneNumber,
        start: startDateTime,
        type: slots.appointmentType,
      });

      return {
        message: confirmationMessage,
        intent: "CONFIRM_APPOINTMENT",
        appointmentCreated: true,
        appointmentId: appointment.id,
      };
    } catch (error) {
      logger.error(
        "Erro ao criar agendamento",
        error instanceof Error ? error : new Error(String(error)),
        {
          sessionId: session.id,
          slots,
        },
      );

      // Tratar erros específicos
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("não disponível") ||
        errorMessage.includes("horário")
      ) {
        return {
          message:
            "Desculpe, este horário não está mais disponível. Pode escolher outro?",
          intent: "SCHEDULE_APPOINTMENT",
        };
      }

      if (
        errorMessage.includes("passada") ||
        errorMessage.includes("passado")
      ) {
        return {
          message:
            "Não é possível agendar para uma data/hora passada. Pode escolher outro horário?",
          intent: "SCHEDULE_APPOINTMENT",
        };
      }

      return {
        message:
          "Desculpe, ocorreu um erro ao criar seu agendamento. Pode tentar novamente?",
        intent: "SCHEDULE_APPOINTMENT",
      };
    }
  }

  /**
   * Lida com coleta de dados para agendamento
   */
  private async handleScheduleAppointment(
    session: any,
    slots: SlotData,
    defaultReply: string,
  ): Promise<ChatbotResponse> {
    // Atualizar contexto da sessão com slots coletados
    await this.updateSessionContext(session.id, slots);

    return {
      message: defaultReply,
      intent: "SCHEDULE_APPOINTMENT",
    };
  }

  /**
   * Lida com cancelamento de agendamento existente
   */
  private async handleCancelAppointment(
    session: any,
    slots: SlotData,
    defaultReply: string,
  ): Promise<ChatbotResponse> {
    try {
      // Buscar agendamento ativo do cliente
      const appointment =
        await this.appointmentService.findActiveAppointmentByPhone(
          session.phoneNumber,
        );

      if (!appointment) {
        return {
          message:
            "Não encontrei nenhum agendamento ativo em seu nome. Posso ajudar com algo mais?",
          intent: "CANCEL_APPOINTMENT",
        };
      }

      // Se ainda não confirmou, perguntar confirmação
      if (slots.confirmation !== "yes") {
        const formattedDate = appointment.start.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const formattedTime = appointment.start.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const typeText = appointment.type === "ONLINE" ? "online" : "na loja";

        return {
          message:
            `Encontrei seu agendamento:\n\n` +
            `📅 Data: ${formattedDate}\n` +
            `🕐 Horário: ${formattedTime}\n` +
            `📍 Tipo: ${typeText}\n\n` +
            `Confirma o cancelamento? (Sim/Não)`,
          intent: "CANCEL_APPOINTMENT",
        };
      }

      // Obter userId do sistema
      const systemUser = await this.getSystemUserId();
      if (!systemUser) {
        logger.error(
          "Não foi possível encontrar usuário do sistema para cancelar agendamento",
        );
        return {
          message:
            "Desculpe, ocorreu um erro interno. Tente novamente mais tarde.",
          intent: "SMALL_TALK",
        };
      }

      // Cancelar agendamento
      await this.appointmentService.cancelAppointment(
        appointment.id,
        systemUser.id,
      );

      logger.info("Agendamento cancelado via chatbot", {
        appointmentId: appointment.id,
        clientName: appointment.clientName,
        phoneNumber: session.phoneNumber,
      });

      // Resetar sessão
      await this.conversationRepo.updateSession(session.id, {
        state: ConversationState.INTRO,
        scheduledAppointmentId: null,
      });

      return {
        message:
          `✅ Agendamento cancelado com sucesso!\n\n` +
          `Se precisar agendar novamente, é só me avisar. 😊`,
        intent: "CANCEL_APPOINTMENT",
      };
    } catch (error) {
      logger.error(
        "Erro ao cancelar agendamento",
        error instanceof Error ? error : new Error(String(error)),
        {
          sessionId: session.id,
        },
      );

      return {
        message:
          "Desculpe, ocorreu um erro ao cancelar seu agendamento. Tente novamente.",
        intent: "CANCEL_APPOINTMENT",
      };
    }
  }

  /**
   * Lida com reagendamento
   */
  private async handleRescheduleAppointment(
    session: any,
    slots: SlotData,
    defaultReply: string,
  ): Promise<ChatbotResponse> {
    try {
      // Buscar agendamento ativo do cliente
      const appointment =
        await this.appointmentService.findActiveAppointmentByPhone(
          session.phoneNumber,
        );

      if (!appointment) {
        return {
          message:
            "Não encontrei nenhum agendamento ativo em seu nome. Posso ajudar com algo mais?",
          intent: "RESCHEDULE_APPOINTMENT",
        };
      }

      // Verificar se temos nova data e horário
      const hasNewDateTime = slots.appointmentDate && slots.appointmentTime;

      if (!hasNewDateTime) {
        const formattedDate = appointment.start.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const formattedTime = appointment.start.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const typeText = appointment.type === "ONLINE" ? "online" : "na loja";

        return {
          message:
            `Encontrei seu agendamento:\n\n` +
            `📅 Data: ${formattedDate}\n` +
            `🕐 Horário: ${formattedTime}\n` +
            `📍 Tipo: ${typeText}\n\n` +
            `Para qual data e horário gostaria de remarcar?`,
          intent: "RESCHEDULE_APPOINTMENT",
        };
      }

      // Parse de nova data e horário
      const newStartDateTime = this.parseAppointmentDateTime(
        slots.appointmentDate!,
        slots.appointmentTime!,
      );

      if (!newStartDateTime) {
        return {
          message:
            "Desculpe, não consegui entender a data ou horário. Pode informar novamente?",
          intent: "RESCHEDULE_APPOINTMENT",
        };
      }

      // Validar horário
      const validation =
        DateTimeParser.validateAppointmentSlot(newStartDateTime);
      if (!validation.isValid) {
        return {
          message: validation.message,
          intent: "RESCHEDULE_APPOINTMENT",
        };
      }

      // Verificar disponibilidade
      const newEndDateTime = new Date(newStartDateTime);
      newEndDateTime.setHours(newEndDateTime.getHours() + 1);

      const availabilityValidation =
        await this.appointmentService.validateAppointment(
          newStartDateTime,
          newEndDateTime,
          appointment.type,
        );

      if (!availabilityValidation.isValid) {
        return {
          message:
            availabilityValidation.message ||
            "Desculpe, este horário não está disponível. Pode escolher outro?",
          intent: "RESCHEDULE_APPOINTMENT",
        };
      }

      // Se ainda não confirmou, perguntar confirmação
      if (slots.confirmation !== "yes") {
        const formattedNewDate = newStartDateTime.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const formattedNewTime = newStartDateTime.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return {
          message:
            `Perfeito! Confirma o reagendamento para:\n\n` +
            `📅 Data: ${formattedNewDate}\n` +
            `🕐 Horário: ${formattedNewTime}\n\n` +
            `Confirma? (Sim/Não)`,
          intent: "RESCHEDULE_APPOINTMENT",
        };
      }

      // Obter userId do sistema
      const systemUser = await this.getSystemUserId();
      if (!systemUser) {
        logger.error(
          "Não foi possível encontrar usuário do sistema para reagendar",
        );
        return {
          message:
            "Desculpe, ocorreu um erro interno. Tente novamente mais tarde.",
          intent: "SMALL_TALK",
        };
      }

      // Reagendar (exclui agendamento antigo e cria um novo)
      const newAppointment =
        await this.appointmentService.rescheduleAppointment(
          appointment.id,
          newStartDateTime,
          newEndDateTime,
          systemUser.id,
        );

      if (!newAppointment) {
        logger.error("Falha ao reagendar - retornou null");
        return {
          message: "Desculpe, ocorreu um erro ao reagendar. Tente novamente.",
          intent: "RESCHEDULE_APPOINTMENT",
        };
      }

      const formattedDate = newStartDateTime.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const formattedTime = newStartDateTime.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const typeText = appointment.type === "ONLINE" ? "online" : "na loja";

      logger.info("Agendamento reagendado via chatbot", {
        oldAppointmentId: appointment.id,
        newAppointmentId: newAppointment.id,
        clientName: appointment.clientName,
        phoneNumber: session.phoneNumber,
        oldStart: appointment.start,
        newStart: newStartDateTime,
      });

      // Atualizar sessão com novo appointmentId
      await this.conversationRepo.updateSession(session.id, {
        state: ConversationState.INTRO,
        scheduledAppointmentId: newAppointment.id,
      });

      return {
        message:
          `✅ Agendamento remarcado com sucesso!\n\n` +
          `📅 Nova data: ${formattedDate}\n` +
          `🕐 Novo horário: ${formattedTime}\n` +
          `📍 Tipo: ${typeText}\n\n` +
          (appointment.type === "ONLINE"
            ? `🔗 Você receberá o novo link da reunião em breve.\n\n`
            : `📍 Endereço: Av. Almirante Barroso, 389, Centro – João Pessoa – PB\n\n`) +
          `Até breve! 😊`,
        intent: "RESCHEDULE_APPOINTMENT",
      };
    } catch (error) {
      logger.error(
        "Erro ao reagendar",
        error instanceof Error ? error : new Error(String(error)),
        {
          sessionId: session.id,
          slots,
        },
      );

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("não disponível") ||
        errorMessage.includes("horário")
      ) {
        return {
          message:
            "Desculpe, este horário não está mais disponível. Pode escolher outro?",
          intent: "RESCHEDULE_APPOINTMENT",
        };
      }

      if (
        errorMessage.includes("passada") ||
        errorMessage.includes("passado")
      ) {
        return {
          message:
            "Não é possível agendar para uma data/hora passada. Pode escolher outro horário?",
          intent: "RESCHEDULE_APPOINTMENT",
        };
      }

      return {
        message:
          "Desculpe, ocorreu um erro ao reagendar. Pode tentar novamente?",
        intent: "RESCHEDULE_APPOINTMENT",
      };
    }
  }

  /**
   * Lida com cancelamento da conversa (não do agendamento)
   */
  private async handleCancel(
    session: any,
    defaultReply: string,
  ): Promise<ChatbotResponse> {
    await this.conversationRepo.updateSession(session.id, {
      state: ConversationState.INTRO,
    });

    return {
      message: defaultReply,
      intent: "CANCEL",
    };
  }

  /**
   * Parse de data e horário do agendamento
   */
  private parseAppointmentDateTime(
    dateStr: string,
    timeStr: string,
  ): Date | null {
    // Tenta parse combinado primeiro (ex: "amanhã 12h")
    const combined = DateTimeParser.parseCombinedDateTime(
      `${dateStr} ${timeStr}`,
    );
    if (combined && combined.date && combined.time) {
      const result = new Date(combined.date);
      result.setHours(
        combined.time.getHours(),
        combined.time.getMinutes(),
        0,
        0,
      );
      return result;
    }

    // Se não funcionar, tenta separado
    return DateTimeParser.parseDateTime(dateStr, timeStr);
  }

  /**
   * Atualiza estado da sessão baseado na interpretação
   */
  private async updateSessionState(
    sessionId: string,
    interpretation: any,
  ): Promise<void> {
    const updates: any = {};

    // Atualizar estado baseado no intent
    switch (interpretation.intent) {
      case "SCHEDULE_APPOINTMENT":
        if (
          interpretation.slots.appointmentDate &&
          interpretation.slots.appointmentTime
        ) {
          updates.state = ConversationState.CONFIRMING;
        } else if (interpretation.slots.appointmentType) {
          updates.state = ConversationState.ASKING_DATE;
        } else if (interpretation.slots.clientName) {
          updates.state = ConversationState.ASKING_APPOINTMENT_TYPE;
        }
        break;

      case "CONFIRM_APPOINTMENT":
        if (interpretation.slots.confirmation === "yes") {
          updates.state = ConversationState.CONFIRMING;
        }
        break;
    }

    // Atualizar campos específicos se presentes nos slots
    if (interpretation.slots.clientName) {
      updates.clientName = interpretation.slots.clientName;
    }
    if (interpretation.slots.appointmentType) {
      updates.appointmentType = interpretation.slots.appointmentType;
    }
    if (interpretation.slots.serviceIntent) {
      updates.serviceIntent = interpretation.slots.serviceIntent;
    }

    if (Object.keys(updates).length > 0) {
      await this.conversationRepo.updateSession(sessionId, updates);
    }
  }

  /**
   * Atualiza contexto da sessão com slots coletados
   */
  private async updateSessionContext(
    sessionId: string,
    slots: SlotData,
  ): Promise<void> {
    const session = await prisma.conversationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return;

    const currentContext = (session.context as any) || {};
    const updatedContext = {
      ...currentContext,
      ...slots,
    };

    await this.conversationRepo.updateSession(sessionId, {
      context: updatedContext,
    });
  }

  /**
   * Obtém usuário do sistema para criar agendamentos (admin ou primeiro disponível)
   */
  private async getSystemUserId(): Promise<{ id: string } | null> {
    try {
      // Tentar buscar admin primeiro
      const admin = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      if (admin) {
        return admin;
      }

      // Se não tiver admin, buscar qualquer usuário
      const anyUser = await prisma.user.findFirst({
        select: { id: true },
      });

      return anyUser;
    } catch (error) {
      logger.error(
        "Erro ao buscar usuário do sistema",
        error instanceof Error ? error : new Error(String(error)),
      );
      return null;
    }
  }

  /**
   * Limpa histórico de conversa
   */
  async clearHistory(phoneNumber: string): Promise<void> {
    await this.conversationRepo.clearConversation(phoneNumber);
  }

  /**
   * Pausa uma conversa por X horas
   */
  async pauseConversation(
    phoneNumber: string,
    hours: number = 2,
  ): Promise<void> {
    await this.conversationRepo.pauseConversation(phoneNumber, hours);
    logger.info("Conversa pausada", {
      phoneNumber,
      hours,
    });
  }

  /**
   * Remove a pausa de uma conversa
   */
  async unpauseConversation(phoneNumber: string): Promise<void> {
    await this.conversationRepo.unpauseConversation(phoneNumber);
    logger.info("Conversa despausada", {
      phoneNumber,
    });
  }

  /**
   * Verifica se uma conversa está pausada
   */
  async isConversationPaused(phoneNumber: string): Promise<boolean> {
    return await this.conversationRepo.isConversationPaused(phoneNumber);
  }

  /**
   * Retorna tempo restante de pausa em minutos
   */
  async getPauseTimeRemaining(phoneNumber: string): Promise<number | null> {
    return await this.conversationRepo.getPauseTimeRemaining(phoneNumber);
  }
}

export default ChatbotOrchestratorService;
