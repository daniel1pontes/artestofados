import OpenAI from "openai";
import { ConversationWithMessages } from "./ConversationRepository";

export type IntentType =
  | "SMALL_TALK"
  | "ASK_INFORMATION"
  | "COLLECT_DATA"
  | "SCHEDULE_APPOINTMENT"
  | "CONFIRM_APPOINTMENT"
  | "CANCEL"
  | "GOODBYE";

export interface SlotData {
  clientName?: string;
  serviceIntent?: string;
  appointmentType?: "ONLINE" | "IN_STORE";
  appointmentDate?: string;
  appointmentTime?: string;
  confirmation?: "yes" | "no";
  projectReference?: string;
}

export interface InterpretationResult {
  reply: string;
  intent: IntentType;
  slots: SlotData;
}

export class NaturalLanguageEngine {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async interpret(
    session: ConversationWithMessages,
    userMessage: string
  ): Promise<InterpretationResult> {
    const systemPrompt = this.buildSystemPrompt(session.state);
    const history = this.serializeHistory(session);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Histórico recente:\n${history}\n\nMensagem atual: "${userMessage}"`,
        },
      ],
    });

    const rawContent =
      response.choices[0]?.message?.content?.trim() ||
      '{"reply":"Desculpe, não entendi.","intent":"SMALL_TALK","slots":{}}';

    return this.parseResult(rawContent);
  }

  private buildSystemPrompt(state: string): string {
    return `
Você é Maria, consultora da Artestofados. Converse de forma natural, acolhedora e objetiva.
Siga ESTE FLUXO SEM inverter a ordem:
1. Recepcione e se apresente brevemente, perguntando o nome.
2. Pergunte se o cliente deseja FABRICAR ou REFORMAR.
3. Se escolher REFORMAR: solicite fotos do estofado, informe que a equipe entrará em contato e encerre.
4. Se escolher FABRICAR: pergunte se já possui projeto ou inspiração (registe em projectReference).
5. Pergunte se prefere reunião ONLINE ou Visita à LOJA (presencial).
6. Colete data e horário do agendamento. IMPORTANTE: Se o cliente disser data e horário juntos (ex: "amanhã 12h", "hoje 14:30"), extraia AMBOS nos slots.
7. Recapitule tudo, solicite confirmação (SIM/NÃO) e finalize.

Estado atual da conversa: ${state}

Sempre responda EXCLUSIVAMENTE em JSON com o formato:
{
  "reply": "mensagem amigável em português",
  "intent": "SMALL_TALK|ASK_INFORMATION|COLLECT_DATA|SCHEDULE_APPOINTMENT|CONFIRM_APPOINTMENT|CANCEL|GOODBYE",
  "slots": {
    "clientName": "string?",
    "serviceIntent": "FABRICAR|REFORMAR?",
    "appointmentType": "ONLINE|IN_STORE?",
    "appointmentDate": "DD/MM/YYYY, 'hoje', 'amanhã', 'segunda', etc. - extraia mesmo que esteja junto com horário",
    "appointmentTime": "HH:mm, '12h', '14:30', etc. - extraia mesmo que esteja junto com data",
    "projectReference": "descrição do projeto/inspiração ou 'nenhum'",
    "confirmation": "yes|no"
  }
}

Diretrizes para extração de data e horário:
- Se o cliente disser "amanhã 12h" ou "amanhã 12:00", extraia appointmentDate="amanhã" E appointmentTime="12:00"
- Se disser "hoje 14:30", extraia appointmentDate="hoje" E appointmentTime="14:30"
- Se disser apenas "amanhã", extraia apenas appointmentDate="amanhã"
- Se disser apenas "12h", extraia apenas appointmentTime="12:00"
- Aceite formatos: "hoje", "amanhã", "segunda", "terça", etc. para datas
- Aceite formatos: "12h", "12:00", "14:30", "2 da tarde", etc. para horários
- Mantenha tom humano e acolhedor.
- Confirme suavemente cada informação coletada.
- Sempre peça fotos para reformas e encerre após orientar.
- Para fabricação, só avance após obter projeto/inspiração, tipo de reunião, data e horário.
- Jamais retorne texto fora do JSON especificado.
`;
  }

  private serializeHistory(session: ConversationWithMessages): string {
    const recentMessages = session.messages.slice(-6);
    if (!recentMessages.length) {
      return "Histórico vazio.";
    }

    return recentMessages
      .map(
        (msg: ConversationWithMessages["messages"][number]) =>
          `${msg.role === "USER" ? "Cliente" : "Maria"}: ${msg.content}`
      )
      .join("\n");
  }

  private parseResult(content: string): InterpretationResult {
    const normalized = content.replace(/```json/gi, "").replace(/```/g, "");
    try {
      const parsed = JSON.parse(normalized);
      return {
        reply: parsed.reply || "Desculpe, não entendi.",
        intent: parsed.intent || "SMALL_TALK",
        slots: parsed.slots || {},
      };
    } catch (error) {
      console.error("Erro ao interpretar resposta do modelo:", error);
      return {
        reply: "Desculpe, não entendi. Pode reformular?",
        intent: "SMALL_TALK",
        slots: {},
      };
    }
  }
}

