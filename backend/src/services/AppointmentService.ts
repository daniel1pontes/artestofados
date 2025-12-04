import {
  PrismaClient,
  AppointmentType,
  Appointment,
} from "@prisma/client";
import { addHours, format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import GoogleCalendarService, {
  AppointmentPayload,
} from "./GoogleCalendarService";
import { DateTimeParser } from "../utils/DateTimeParser";
import { createLogger } from "../utils/logger";

const prisma = new PrismaClient();

interface CreateAppointmentData {
  clientName: string;
  clientPhone: string;
  type: AppointmentType;
  start: Date;
  end: Date;
  userId: string;
}

interface ValidationResult {
  isValid: boolean;
  message: string;
}

class AppointmentService {
  private readonly BUSINESS_START_HOUR = 8;
  private readonly BUSINESS_END_HOUR = 18;
  private readonly SLOT_DURATION_HOURS = 1;
  private googleCalendar = new GoogleCalendarService();
  private logger = createLogger("AppointmentService");

  async createAppointment(data: CreateAppointmentData) {
    this.ensureBusinessRules(data.start, data.end);

    const availability = await this.validateAppointment(
      data.start,
      data.end,
      data.type
    );

    if (!availability.isValid) {
      throw new Error(availability.message);
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        type: data.type,
        start: data.start,
        end: data.end,
        createdBy: data.userId,
        lastEditedBy: data.userId,
      },
    });

    // Sincronizar com Google Calendar
    try {
      await this.syncWithCalendar(appointment);
      this.logger.info("Agendamento sincronizado com Google Calendar", {
        appointmentId: appointment.id,
        clientName: appointment.clientName,
      });
    } catch (error) {
      this.logger.error(
        "Falha ao sincronizar agendamento com Google Calendar",
        error instanceof Error ? error : new Error(String(error)),
        {
          appointmentId: appointment.id,
          clientName: appointment.clientName,
          start: appointment.start,
          end: appointment.end,
        }
      );
      // Não lançamos o erro para não impedir a criação do agendamento
      // mas logamos para diagnóstico
    }

    return prisma.appointment.findUnique({
      where: { id: appointment.id },
      include: {
        createdByUser: {
          select: { name: true, email: true },
        },
      },
    });
  }

  async validateAppointment(
    start: Date,
    end: Date,
    type: AppointmentType
  ): Promise<ValidationResult> {
    try {
      this.ensureBusinessRules(start, end);
    } catch (error) {
      return {
        isValid: false,
        message:
          error instanceof Error
            ? error.message
            : "Horário de agendamento inválido.",
      };
    }

    const available = await this.checkAvailability(start, end, type);

    if (!available) {
      return {
        isValid: false,
        message: "Horário não disponível. Por favor, escolha outro horário.",
      };
    }

    return { isValid: true, message: "Horário disponível" };
  }

  async checkAvailability(
    start: Date,
    end: Date,
    type: AppointmentType
  ): Promise<boolean> {
    const conflicts = await prisma.appointment.count({
      where: {
        type,
        OR: [
          { start: { gte: start, lt: end } },
          { end: { gt: start, lte: end } },
          {
            AND: [{ start: { lte: start } }, { end: { gte: end } }],
          },
        ],
      },
    });

    return conflicts === 0;
  }

  async getAvailableSlots(
    date: Date,
    type: AppointmentType
  ): Promise<string[]> {
    const slots: string[] = [];
    const targetDate = startOfDay(date);

    if (!this.isWeekday(targetDate)) {
      return slots;
    }

    for (
      let hour = this.BUSINESS_START_HOUR;
      hour < this.BUSINESS_END_HOUR;
      hour++
    ) {
      const slotStart = new Date(targetDate);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = addHours(slotStart, this.SLOT_DURATION_HOURS);

      if (isBefore(slotStart, new Date())) {
        continue;
      }

      const available = await this.checkAvailability(
        slotStart,
        slotEnd,
        type
      );

      if (available) {
        slots.push(format(slotStart, "HH:mm", { locale: ptBR }));
      }
    }

    return slots;
  }

  parseDateTime(dateStr: string, timeStr: string): Date | null {
    return DateTimeParser.parseDateTime(dateStr, timeStr);
  }

  formatDateTime(date: Date): string {
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  }

  formatDate(date: Date): string {
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  }

  formatTime(date: Date): string {
    return format(date, "HH:mm", { locale: ptBR });
  }

  getBusinessHoursMessage(): string {
    return DateTimeParser.getBusinessHoursMessage();
  }

  private ensureBusinessRules(start: Date, end: Date) {
    if (!this.isWeekday(start)) {
      throw new Error(
        "Atendimentos disponíveis apenas de segunda a sexta-feira."
      );
    }

    if (!this.isBusinessHours(start) || !this.isBusinessHours(end)) {
      throw new Error(
        `Horário de atendimento: ${this.BUSINESS_START_HOUR}h às ${this.BUSINESS_END_HOUR}h.`
      );
    }

    if (isBefore(start, new Date())) {
      throw new Error("Não é possível agendar para uma data/hora passada.");
    }

    if (end <= start) {
      throw new Error("Horário final deve ser maior que o horário inicial.");
    }
  }

  private isBusinessHours(date: Date): boolean {
    return DateTimeParser.isBusinessHours(date);
  }

  private isWeekday(date: Date): boolean {
    return DateTimeParser.isWeekday(date);
  }

  private async syncWithCalendar(appointment: Appointment) {
    this.logger.info("Iniciando sincronização com Google Calendar", {
      appointmentId: appointment.id,
      clientName: appointment.clientName,
      start: appointment.start,
      end: appointment.end,
    });

    const payload: AppointmentPayload = {
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      type: appointment.type,
      start: appointment.start,
      end: appointment.end,
    };

    const calendarEvent = await this.googleCalendar.createAppointment(payload);

    if (!calendarEvent?.id) {
      this.logger.warn("Google Calendar retornou null ou evento sem ID", {
        appointmentId: appointment.id,
        calendarEvent: calendarEvent ? "existe mas sem ID" : "null",
      });
      throw new Error(
        "Falha ao criar evento no Google Calendar: evento não foi criado ou não possui ID"
      );
    }

    this.logger.info("Evento criado no Google Calendar", {
      appointmentId: appointment.id,
      calendarEventId: calendarEvent.id,
    });

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        gcalEventId: calendarEvent.id,
        meetLink: calendarEvent.conferenceData?.entryPoints?.[0]?.uri,
      },
    });

    this.logger.info("Agendamento atualizado com ID do evento do Google Calendar", {
      appointmentId: appointment.id,
      calendarEventId: calendarEvent.id,
    });
  }
}

export default AppointmentService;
