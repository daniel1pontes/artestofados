import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import AppointmentService from "../services/AppointmentService";
import GoogleCalendarService from "../services/GoogleCalendarService";
import { config } from "../config/environment";
import { z } from "zod";

const router = Router();
const appointmentService = new AppointmentService();
const googleCalendarService = new GoogleCalendarService();

// Schema de validação para criação de agendamento
const createAppointmentSchema = z.object({
  clientName: z.string().min(1, "Nome do cliente é obrigatório"),
  clientPhone: z.string().min(1, "Telefone do cliente é obrigatório"),
  type: z.enum(["ONLINE", "IN_STORE"], {
    errorMap: () => ({ message: "Tipo deve ser ONLINE ou IN_STORE" }),
  }),
  date: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Data deve estar no formato DD/MM/AAAA"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:mm"),
});

// Listar todos os agendamentos
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const { start, end, type } = req.query;

    const where: any = {};

    // Filtro de sobreposição de intervalos: um agendamento se sobrepõe ao intervalo [start, end]
    // se appointment.start < end E appointment.end > start
    if (start && end) {
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);

      // Lógica correta de sobreposição: um agendamento se sobrepõe se:
      // - começa antes ou no fim do intervalo E
      // - termina depois ou no início do intervalo
      where.AND = [
        { start: { lte: endDate } }, // O agendamento começa antes ou no fim do intervalo
        { end: { gte: startDate } }, // O agendamento termina depois ou no início do intervalo
      ];
    } else if (start) {
      // Se só tem start, busca agendamentos que terminam depois ou no start
      where.end = { gte: new Date(start as string) };
    } else if (end) {
      // Se só tem end, busca agendamentos que começam antes ou no end
      where.start = { lte: new Date(end as string) };
    }

    if (type) {
      where.type = type as "ONLINE" | "IN_STORE";
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { start: "asc" },
    });

    res.json(appointments);
  } catch (error) {
    next(error);
  }
});

// Obter um agendamento específico
router.get("/:id", authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        lastEditedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!appointment) {
      throw createError("Agendamento não encontrado", 404);
    }

    res.json(appointment);
  } catch (error) {
    next(error);
  }
});

// Criar novo agendamento
router.post("/", authenticateToken, async (req, res, next) => {
  try {
    const validatedData = createAppointmentSchema.parse(req.body);
    const userId = (req as any).user.id;

    // Parse date and time
    const startDateTime = appointmentService.parseDateTime(
      validatedData.date,
      validatedData.time,
    );

    if (!startDateTime) {
      throw createError("Data ou horário inválido", 400);
    }

    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + 1);

    // Validar agendamento
    const validation = await appointmentService.validateAppointment(
      startDateTime,
      endDateTime,
      validatedData.type,
    );

    if (!validation.isValid) {
      throw createError(validation.message, 400);
    }

    // Criar agendamento
    const appointment = await appointmentService.createAppointment({
      clientName: validatedData.clientName,
      clientPhone: validatedData.clientPhone,
      type: validatedData.type,
      start: startDateTime,
      end: endDateTime,
      userId,
    });

    res.status(201).json(appointment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.errors,
      });
    }
    next(error);
  }
});

// Atualizar agendamento (apenas dados do cliente, não horário)
router.put("/:id", authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { clientName, clientPhone, notes, status } = req.body;
    const userId = (req as any).user.id;

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      throw createError("Agendamento não encontrado", 404);
    }

    const updateData: any = {
      lastEditedBy: userId,
    };

    if (clientName) updateData.clientName = clientName;
    if (clientPhone) updateData.clientPhone = clientPhone;
    if (notes !== undefined) updateData.notes = notes;
    if (status) updateData.status = status;

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        lastEditedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(updatedAppointment);
  } catch (error) {
    next(error);
  }
});

// Reagendar (mudar data/horário) - Remove evento antigo do Google Calendar e cria novo
router.put("/:id/reschedule", authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, time } = req.body;
    const userId = (req as any).user.id;

    if (!date || !time) {
      throw createError("Data e horário são obrigatórios", 400);
    }

    const startDateTime = appointmentService.parseDateTime(date, time);

    if (!startDateTime) {
      throw createError("Data ou horário inválido", 400);
    }

    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + 1);

    const rescheduledAppointment =
      await appointmentService.rescheduleAppointment(
        id,
        startDateTime,
        endDateTime,
        userId,
      );

    res.json({
      success: true,
      appointment: rescheduledAppointment,
      message: "Agendamento remarcado com sucesso",
    });
  } catch (error) {
    next(error);
  }
});

// Cancelar agendamento - Remove do Google Calendar e marca como cancelado
router.post("/:id/cancel", authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const cancelledAppointment = await appointmentService.cancelAppointment(
      id,
      userId,
    );

    res.json({
      success: true,
      appointment: cancelledAppointment,
      message: "Agendamento cancelado com sucesso",
    });
  } catch (error) {
    next(error);
  }
});

// Deletar agendamento permanentemente (não recomendado - use cancelar)
router.delete("/:id", authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw createError("Agendamento não encontrado", 404);
    }

    // Remover do Google Calendar se existir
    if (appointment.gcalEventId) {
      await googleCalendarService.deleteAppointment(appointment.gcalEventId);
    }

    await prisma.appointment.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Agendamento deletado permanentemente",
    });
  } catch (error) {
    next(error);
  }
});

// Obter horários disponíveis para uma data
router.get("/availability/:date", authenticateToken, async (req, res, next) => {
  try {
    const { date } = req.params;
    const { type } = req.query;

    if (!type || (type !== "ONLINE" && type !== "IN_STORE")) {
      throw createError("Tipo de agendamento inválido", 400);
    }

    // Validar formato da data
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      throw createError("Data deve estar no formato DD/MM/AAAA", 400);
    }

    // Parse date
    const [day, month, year] = date.split("/").map((n) => parseInt(n, 10));
    const targetDate = new Date(year, month - 1, day);

    if (isNaN(targetDate.getTime())) {
      throw createError("Data inválida", 400);
    }

    const availableSlots = await appointmentService.getAvailableSlots(
      targetDate,
      type as "ONLINE" | "IN_STORE",
    );

    res.json({
      date,
      type,
      availableSlots,
      businessHours: appointmentService.getBusinessHoursMessage(),
    });
  } catch (error) {
    next(error);
  }
});

// Validar disponibilidade de um horário específico
router.post("/validate", authenticateToken, async (req, res, next) => {
  try {
    const { date, time, type } = req.body;

    if (!date || !time || !type) {
      throw createError("Data, horário e tipo são obrigatórios", 400);
    }

    const startDateTime = appointmentService.parseDateTime(date, time);

    if (!startDateTime) {
      throw createError("Data ou horário inválido", 400);
    }

    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + 1);

    const validation = await appointmentService.validateAppointment(
      startDateTime,
      endDateTime,
      type as "ONLINE" | "IN_STORE",
    );

    res.json({
      isValid: validation.isValid,
      message: validation.message,
      formattedDateTime: validation.isValid
        ? appointmentService.formatDateTime(startDateTime)
        : null,
    });
  } catch (error) {
    next(error);
  }
});

// Verificar disponibilidade no Google Calendar
router.post(
  "/check-availability",
  authenticateToken,
  async (req, res, next) => {
    try {
      const { start, end, calendarId } = req.body;

      if (!start || !end) {
        throw createError("Data de início e fim são obrigatórias", 400);
      }

      const startDate = new Date(start);
      const endDate = new Date(end);

      const isAvailable = await googleCalendarService.checkAvailability(
        startDate,
        endDate,
      );

      res.json({
        isAvailable,
        message: isAvailable
          ? "Horário disponível no Google Calendar"
          : "Horário não disponível no Google Calendar",
      });
    } catch (error) {
      next(error);
    }
  },
);

// Sincronizar agendamento com Google Calendar
router.post("/:id/sync-calendar", authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw createError("Agendamento não encontrado", 404);
    }

    const calendarEvent = await googleCalendarService.createAppointment({
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      type: appointment.type,
      start: appointment.start,
      end: appointment.end,
    });

    if (calendarEvent?.id) {
      // Atualizar agendamento com ID do evento
      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: {
          gcalEventId: calendarEvent.id,
          gcalCalendarId: config.google.calendarId,
          gcalSyncedAt: new Date(),
          gcalStatus: "synced",
          meetLink: calendarEvent.conferenceData?.entryPoints?.[0]?.uri,
          lastEditedBy: userId,
        },
        include: {
          createdByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.json({
        success: true,
        appointment: updatedAppointment,
        calendarEvent,
        message: "Agendamento sincronizado com Google Calendar",
      });
    } else {
      throw createError("Falha ao criar evento no Google Calendar", 500);
    }
  } catch (error) {
    next(error);
  }
});

// Remover evento do Google Calendar
router.delete(
  "/:id/calendar-event",
  authenticateToken,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const appointment = await prisma.appointment.findUnique({
        where: { id },
      });

      if (!appointment) {
        throw createError("Agendamento não encontrado", 404);
      }

      if (!appointment.gcalEventId) {
        throw createError(
          "Agendamento não possui evento no Google Calendar",
          400,
        );
      }

      const deleted = await googleCalendarService.deleteAppointment(
        appointment.gcalEventId,
      );

      if (deleted) {
        await prisma.appointment.update({
          where: { id },
          data: {
            gcalEventId: null,
            gcalCalendarId: null,
            gcalSyncedAt: null,
            gcalStatus: null,
            meetLink: null,
          },
        });

        res.json({
          success: true,
          message: "Evento removido do Google Calendar",
        });
      } else {
        throw createError("Falha ao remover evento do Google Calendar", 500);
      }
    } catch (error) {
      next(error);
    }
  },
);

export default router;
