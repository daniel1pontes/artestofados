import { google } from "googleapis";
import { AppointmentType } from "@prisma/client";
import { config } from "../config/environment";
import { createLogger } from "../utils/logger";

export interface AppointmentPayload {
  clientName: string;
  clientPhone: string;
  type: AppointmentType;
  start: Date;
  end: Date;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  conferenceData?: any;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

class GoogleCalendarService {
  private calendar: ReturnType<typeof google.calendar> | null = null;
  private logger = createLogger("GoogleCalendarService");
  private readonly timezone = "America/Sao_Paulo";
  private readonly calendarId: string;

  constructor() {
    this.calendarId = config.google.calendarId || "primary";
    this.initialize();
  }

  private initialize(): void {
    try {
      const credentials = config.google.credentials;

      if (!credentials) {
        this.logger.warn(
          "⚠️ Credenciais do Google Calendar não configuradas. " +
          "Configure GOOGLE_API_CREDENTIALS no arquivo .env com o JSON das credenciais",
        );
        return;
      }

      this.logger.info("Inicializando Google Calendar");

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/calendar"],
      });

      this.calendar = google.calendar({
        version: "v3",
        auth,
      });

      this.logger.info("Google Calendar inicializado com sucesso", {
        projectId: credentials.project_id,
        clientEmail: credentials.client_email,
        calendarId: this.calendarId,
      });
    } catch (error) {
      const errorObj = this.toError(error);
      this.logger.error(
        "Falha ao inicializar Google Calendar",
        errorObj,
      );
      this.calendar = null;
    }
  }

  async createAppointment(
    payload: AppointmentPayload
  ): Promise<CalendarEvent | null> {
    if (!this.calendar) {
      this.logger.warn("Google Calendar não configurado. Verifique as credenciais no arquivo .env.");
      return null;
    }

    try {
      const eventPayload = this.buildEventPayload(payload);
      this.logger.info("Criando evento no Google Calendar", {
        clientName: payload.clientName,
        start: payload.start.toISOString(),
        end: payload.end.toISOString(),
        type: payload.type,
      });

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        conferenceDataVersion: 1,
        requestBody: eventPayload,
      });

      if (!response.data?.id) {
        this.logger.error(
          "Google Calendar retornou resposta sem ID do evento",
          undefined,
          {
            response: JSON.stringify(response.data),
          }
        );
        return null;
      }

      this.logger.info("Evento criado com sucesso no Google Calendar", {
        eventId: response.data.id,
        clientName: payload.clientName,
      });

      return response.data as CalendarEvent;
    } catch (error: any) {
      const errorObj = this.toError(error);
      
      // Extrair informações detalhadas do erro do Google
      let errorDetails: any = {
        clientName: payload.clientName,
        start: payload.start.toISOString(),
        end: payload.end.toISOString(),
        type: payload.type,
      };

      if (error?.response?.data) {
        errorDetails.googleError = {
          code: error.response.data.error?.code,
          message: error.response.data.error?.message,
          errors: error.response.data.error?.errors,
        };
      } else if (error?.code) {
        errorDetails.googleError = {
          code: error.code,
          message: error.message,
        };
      }

      this.logger.error(
        "Erro ao criar evento no Google Calendar",
        errorObj,
        errorDetails
      );
      return null;
    }
  }

  async updateAppointment(
    eventId: string,
    payload: Partial<AppointmentPayload>
  ): Promise<CalendarEvent | null> {
    if (!this.calendar) {
      return null;
    }

    try {
      const existing = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId,
      });

      const fallbackStart = existing.data.start?.dateTime
        ? new Date(existing.data.start.dateTime)
        : payload.start || new Date();
      const fallbackEnd = existing.data.end?.dateTime
        ? new Date(existing.data.end.dateTime)
        : payload.end || new Date(fallbackStart.getTime() + 3600000);

      const merged = {
        ...existing.data,
        ...this.buildEventPayload({
          clientName: payload.clientName || "",
          clientPhone: payload.clientPhone || "",
          type: payload.type || "IN_STORE",
          start: payload.start || fallbackStart,
          end: payload.end || fallbackEnd,
        }),
      };

      const response = await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId,
        conferenceDataVersion: 1,
        requestBody: merged,
      });

      return response.data as CalendarEvent;
    } catch (error) {
      this.logger.error(
        "Erro ao atualizar evento do Google Calendar",
        this.toError(error)
      );
      return null;
    }
  }

  async deleteAppointment(eventId: string): Promise<boolean> {
    if (!this.calendar) {
      return false;
    }

    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
      });
      return true;
    } catch (error) {
      this.logger.error(
        "Erro ao remover evento no Google Calendar",
        this.toError(error)
      );
      return false;
    }
  }

  async checkAvailability(start: Date, end: Date): Promise<boolean> {
    if (!this.calendar) {
      return true;
    }

    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 1,
      });

      return (response.data.items?.length || 0) === 0;
    } catch (error) {
      this.logger.error(
        "Erro ao verificar disponibilidade no Calendar",
        this.toError(error)
      );
      return true;
    }
  }

  private buildEventPayload(payload: AppointmentPayload) {
    const appointmentTypeName =
      payload.type === "ONLINE" ? "Reunião Online" : "Visita à Loja";

    return {
      summary: `Atendimento - ${appointmentTypeName} | ${payload.clientName}`,
      description: this.buildDescription(payload),
      start: {
        dateTime: payload.start.toISOString(),
        timeZone: this.timezone,
      },
      end: {
        dateTime: payload.end.toISOString(),
        timeZone: this.timezone,
      },
      conferenceData:
        payload.type === "ONLINE"
          ? {
              createRequest: {
                requestId: `meeting_${Date.now()}_${payload.clientPhone}`,
                conferenceSolutionKey: { type: "hangoutsMeet" },
              },
            }
          : undefined,
      extendedProperties: {
        private: {
          clientName: payload.clientName,
          clientPhone: payload.clientPhone,
          appointmentType: payload.type,
          source: "artestofados_chatbot",
        },
      },
    };
  }

  private buildDescription(payload: AppointmentPayload): string {
    const lines = [
      `Cliente: ${payload.clientName}`,
      `Telefone: ${payload.clientPhone}`,
      `Modalidade: ${payload.type === "ONLINE" ? "Online" : "Visita na loja"}`,
    ];

    if (payload.type === "IN_STORE") {
      lines.push(
        "Endereço: Av. Almirante Barroso, 389, Centro – João Pessoa – PB"
      );
    }

    return lines.join("\n");
  }


  private toError(error: unknown): Error | undefined {
    if (error instanceof Error) {
      return error;
    }

    if (!error) {
      return undefined;
    }

    return new Error(
      typeof error === "string" ? error : JSON.stringify(error)
    );
  }
}

export default GoogleCalendarService;
