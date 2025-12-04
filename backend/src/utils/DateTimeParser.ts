import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ParsedDateResult {
  date: Date;
  confidence: "high" | "medium" | "low";
}

export class DateTimeParser {
  private static readonly DATE_PATTERNS = [
    // DD/MM/YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    // "15 de janeiro de 2025"
    /^(\d{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})$/i,
  ];

  private static readonly TIME_PATTERNS = [
    // HH:mm
    /^(\d{2}):(\d{2})$/,
    // HHh
    /^(\d{1,2})h$/,
    // "X da tarde/manhã/noite"
    /^(\d{1,2})\s+da\s+(tarde|manhã|noite)$/i,
    // "X horas"
    /^(\d{1,2})\s+horas$/i,
  ];

  private static readonly MONTH_MAP: { [key: string]: number } = {
    janeiro: 0,
    fevereiro: 1,
    março: 2,
    abril: 3,
    maio: 4,
    junho: 5,
    julho: 6,
    agosto: 7,
    setembro: 8,
    outubro: 9,
    novembro: 10,
    dezembro: 11,
  };

  private static readonly PERIOD_MAP: { [key: string]: number } = {
    manhã: 0,
    tarde: 12,
    noite: 18,
  };

  static parseDate(dateStr: string): ParsedDateResult | null {
    const normalized = dateStr.toLowerCase().trim();

    // Relative dates
    if (normalized === "hoje" || normalized.includes("hoje")) {
      return {
        date: new Date(),
        confidence: "high",
      };
    }

    if (normalized === "amanhã" || normalized === "amanha" || normalized.includes("amanhã") || normalized.includes("amanha")) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        date: tomorrow,
        confidence: "high",
      };
    }

    // "depois de amanhã" ou "depois de amanha"
    if (normalized.includes("depois de amanhã") || normalized.includes("depois de amanha")) {
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      return {
        date: dayAfterTomorrow,
        confidence: "high",
      };
    }

    // Dias da semana
    const weekdays: { [key: string]: number } = {
      "segunda": 1,
      "segunda-feira": 1,
      "terça": 2,
      "terça-feira": 2,
      "terca": 2,
      "terca-feira": 2,
      "quarta": 3,
      "quarta-feira": 3,
      "quinta": 4,
      "quinta-feira": 4,
      "sexta": 5,
      "sexta-feira": 5,
    };

    for (const [dayName, dayOfWeek] of Object.entries(weekdays)) {
      if (normalized.includes(dayName)) {
        const today = new Date();
        const currentDay = today.getDay();
        let daysToAdd = dayOfWeek - currentDay;
        
        // Se o dia já passou esta semana, pegar o próximo
        if (daysToAdd <= 0) {
          daysToAdd += 7;
        }
        
        const targetDate = new Date();
        targetDate.setDate(today.getDate() + daysToAdd);
        return {
          date: targetDate,
          confidence: "high",
        };
      }
    }

    // Try pattern matching
    for (const pattern of this.DATE_PATTERNS) {
      const match = dateStr.match(pattern);
      if (match) {
        try {
          let date: Date;

          if (pattern === this.DATE_PATTERNS[0]) {
            // DD/MM/YYYY
            const [, day, month, year] = match;
            date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            // "15 de janeiro de 2025"
            const [, day, monthName, year] = match;
            const month = this.MONTH_MAP[monthName.toLowerCase()];
            date = new Date(parseInt(year), month, parseInt(day));
          }

          if (isValid(date)) {
            return {
              date,
              confidence: "high",
            };
          }
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  static parseTime(timeStr: string): Date | null {
    const normalized = timeStr.toLowerCase().trim();

    // Primeiro, tentar extrair horário de expressões combinadas como "12h", "12:00", "12 horas"
    // Padrão para "12h" ou "12:00" no meio de uma frase
    const combinedPattern = /(\d{1,2})[h:](\d{0,2})/;
    const combinedMatch = normalized.match(combinedPattern);
    
    if (combinedMatch) {
      try {
        let hours = parseInt(combinedMatch[1]);
        let minutes = combinedMatch[2] ? parseInt(combinedMatch[2]) : 0;
        
        // Validar horas e minutos
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          const time = new Date();
          time.setHours(hours, minutes, 0, 0);
          return time;
        }
      } catch (error) {
        // Continuar para outros padrões
      }
    }

    for (const pattern of this.TIME_PATTERNS) {
      const match = timeStr.match(pattern);
      if (match) {
        try {
          const now = new Date();
          let hours = 0;
          let minutes = 0;

          if (pattern === this.TIME_PATTERNS[0]) {
            // HH:mm
            const [, h, m] = match;
            hours = parseInt(h);
            minutes = parseInt(m);
          } else if (pattern === this.TIME_PATTERNS[1]) {
            // HHh
            const [, h] = match;
            hours = parseInt(h);
            minutes = 0;
          } else if (pattern === this.TIME_PATTERNS[2]) {
            // "X da tarde/manhã/noite"
            const [, h, period] = match;
            hours = parseInt(h) + this.PERIOD_MAP[period.toLowerCase()];
            minutes = 0;
          } else if (pattern === this.TIME_PATTERNS[3]) {
            // "X horas"
            const [, h] = match;
            hours = parseInt(h);
            minutes = 0;
          }

          // Validate hours and minutes
          if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            const time = new Date();
            time.setHours(hours, minutes, 0, 0);
            return time;
          }
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Tenta extrair data e horário de uma única string (ex: "amanhã 12h", "hoje 14:30")
   */
  static parseCombinedDateTime(dateTimeStr: string): { date: Date | null; time: Date | null } | null {
    const normalized = dateTimeStr.toLowerCase().trim();
    
    // Padrão mais flexível para capturar "amanhã 12h", "hoje 14:30", "amanhã 12:00", etc.
    // Aceita: data (hoje/amanhã/dia da semana) + espaço + horário (12h, 12:00, 12 horas)
    const combinedPattern = /(hoje|amanhã|amanha|depois de amanhã|depois de amanha|segunda|terça|terca|quarta|quinta|sexta|segunda-feira|terça-feira|terca-feira|quarta-feira|quinta-feira|sexta-feira)\s+(\d{1,2})(?:[h:](\d{0,2})|(?:\s+horas?))?/i;
    const match = normalized.match(combinedPattern);
    
    if (match) {
      const datePart = match[1];
      const hourPart = match[2];
      const minutePart = match[3] || "0";
      
      const parsedDate = this.parseDate(datePart);
      const timeStr = minutePart ? `${hourPart}:${minutePart.padStart(2, '0')}` : `${hourPart}:00`;
      const parsedTime = this.parseTime(timeStr);
      
      if (parsedDate && parsedTime) {
        return { date: parsedDate.date, time: parsedTime };
      }
    }
    
    // Tentar padrão alternativo: horário primeiro, depois data
    const reversePattern = /(\d{1,2})(?:[h:](\d{0,2})|(?:\s+horas?))?\s+(hoje|amanhã|amanha|depois de amanhã|depois de amanha|segunda|terça|terca|quarta|quinta|sexta)/i;
    const reverseMatch = normalized.match(reversePattern);
    
    if (reverseMatch) {
      const hourPart = reverseMatch[1];
      const minutePart = reverseMatch[2] || "0";
      const datePart = reverseMatch[3];
      
      const parsedDate = this.parseDate(datePart);
      const timeStr = minutePart ? `${hourPart}:${minutePart.padStart(2, '0')}` : `${hourPart}:00`;
      const parsedTime = this.parseTime(timeStr);
      
      if (parsedDate && parsedTime) {
        return { date: parsedDate.date, time: parsedTime };
      }
    }
    
    return null;
  }

  static parseDateTime(dateStr: string, timeStr: string): Date | null {
    // Primeiro, tentar extrair de uma string combinada se ambas vierem juntas
    const combinedInput = `${dateStr} ${timeStr}`.trim();
    const combined = this.parseCombinedDateTime(combinedInput);
    if (combined && combined.date && combined.time) {
      const result = new Date(combined.date);
      result.setHours(combined.time.getHours(), combined.time.getMinutes(), 0, 0);
      return result;
    }

    // Se não funcionar, tentar separadamente
    const parsedDate = this.parseDate(dateStr);
    const parsedTime = this.parseTime(timeStr);

    if (!parsedDate || !parsedTime) {
      return null;
    }

    const result = new Date(parsedDate.date);
    result.setHours(parsedTime.getHours(), parsedTime.getMinutes(), 0, 0);

    return result;
  }

  /**
   * Converte string de data/hora para objeto Date considerando timezone de São Paulo
   * Baseado no fluxo do projeto funcional
   */
  static parseBrazilDateTime(dateTimeStr: string | Date): Date {
    try {
      // Se já é um objeto Date, retorna normalizado
      if (dateTimeStr instanceof Date) {
        return this.normalizeToSaoPauloTimezone(dateTimeStr);
      }

      // Se é string ISO ou formato reconhecido
      const date = new Date(dateTimeStr as string);

      if (isNaN(date.getTime())) {
        throw new Error(`Data/hora inválida: ${dateTimeStr}`);
      }

      return this.normalizeToSaoPauloTimezone(date);
    } catch (error) {
      console.error("Error parsing Brazil datetime:", error);
      throw new Error(`Erro ao processar data/hora: ${dateTimeStr}`);
    }
  }

  /**
   * Normaliza uma data para o timezone de São Paulo
   */
  static normalizeToSaoPauloTimezone(date: Date): Date {
    // Converte para timezone de São Paulo
    const utcTime = date.getTime();
    const saopauloOffset = -3 * 60 * 60 * 1000; // UTC-3 para São Paulo
    const saoPauloTime = new Date(utcTime + saopauloOffset);

    return saoPauloTime;
  }

  /**
   * Converte data para formato ISO com timezone de São Paulo
   * Para envio ao Google Calendar
   */
  static toISOStringSaoPaulo(date: Date): string {
    const normalized = this.normalizeToSaoPauloTimezone(date);
    const isoString = normalized.toISOString();

    // Adiciona offset de São Paulo (-03:00)
    return isoString.replace("Z", "-03:00");
  }

  /**
   * Validação completa para agendamento
   * Verifica horário comercial, dia útil e disponibilidade
   */
  static validateAppointmentSlot(dateTime: Date): {
    isValid: boolean;
    message: string;
  } {
    // Verificar se é data futura
    const now = new Date();
    if (dateTime <= now) {
      return {
        isValid: false,
        message: "Não é possível agendar para uma data/hora passada.",
      };
    }

    // Verificar dia útil (segunda a sexta)
    if (!this.isWeekday(dateTime)) {
      return {
        isValid: false,
        message: "Atendimentos disponíveis apenas de segunda a sexta-feira.",
      };
    }

    // Verificar horário comercial
    if (!this.isBusinessHours(dateTime)) {
      return {
        isValid: false,
        message: this.getBusinessHoursMessage(),
      };
    }

    return {
      isValid: true,
      message: "Horário disponível para agendamento.",
    };
  }

  /**
   * Cria objeto de evento para Google Calendar
   * Baseado no fluxo do projeto funcional
   */
  static createGoogleCalendarEvent(options: {
    startTime: Date;
    endTime?: Date;
    clientName: string;
    appointmentType: "ONLINE" | "IN_STORE";
    duration?: number; // em minutos
  }) {
    const {
      startTime,
      endTime = new Date(
        startTime.getTime() + (options.duration || 60) * 60000
      ),
      clientName,
      appointmentType,
    } = options;

    // Validação do horário
    const validation = this.validateAppointmentSlot(startTime);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    const appointmentTypeName =
      appointmentType === "ONLINE" ? "Reunião Online" : "Visita à Loja";

    return {
      summary: `Atendimento - ${appointmentTypeName} | ${clientName}`,
      description: `Cliente: ${clientName}\nTipo: ${appointmentTypeName}\nAgendado via WhatsApp em ${new Date().toLocaleDateString(
        "pt-BR"
      )}`,
      start: {
        dateTime: this.toISOStringSaoPaulo(startTime),
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: this.toISOStringSaoPaulo(endTime),
        timeZone: "America/Sao_Paulo",
      },
      extendedProperties: {
        private: {
          appointmentType,
          clientName,
          source: "whatsapp_bot",
        },
      },
    };
  }

  static isBusinessHours(date: Date): boolean {
    const hours = date.getHours();
    const dayOfWeek = date.getDay();

    // Monday to Friday (1-5) and 8:00 to 18:00
    return dayOfWeek >= 1 && dayOfWeek <= 5 && hours >= 8 && hours < 18;
  }

  static isWeekday(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  static getBusinessHoursMessage(): string {
    return "Nosso horário de atendimento é de segunda a sexta-feira, das 08:00 às 18:00.";
  }

  static generateSuggestions(input: string): string[] {
    const normalized = input.toLowerCase().trim();
    const suggestions: string[] = [];

    // Date suggestions
    if (normalized.includes("hoje") || normalized.includes("agora")) {
      suggestions.push("Tente: hoje");
    }

    if (normalized.includes("amanhã") || normalized.includes("amanha")) {
      suggestions.push("Tente: amanhã");
    }

    if (/\d/.test(normalized)) {
      suggestions.push("Tente: 15/01/2025");
      suggestions.push("Tente: 15 de janeiro de 2025");
    }

    // Time suggestions
    if (normalized.includes("manhã") || normalized.includes("madrugada")) {
      suggestions.push("Tente: 09:00");
      suggestions.push("Tente: 9 da manhã");
    }

    if (normalized.includes("tarde")) {
      suggestions.push("Tente: 14:00");
      suggestions.push("Tente: 2 da tarde");
    }

    if (normalized.includes("noite")) {
      suggestions.push("Tente: 16:00");
      suggestions.push("Tente: 4 da tarde");
    }

    if (/\d/.test(normalized)) {
      suggestions.push("Tente: 14:30");
      suggestions.push("Tente: 14h");
      suggestions.push("Tente: 14 horas");
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }
}
