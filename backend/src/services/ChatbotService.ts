import OpenAI from "openai";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interfaces and Types
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

class ChatbotService {
  private openai!: OpenAI;
  private conversationHistory: Map<string, ChatMessage[]> = new Map();
  private readonly maxHistoryLength = 20;

  constructor() {
    this.initializeServices();
  }

  private initializeServices(): void {
    try {
      // Initialize OpenAI
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      console.log("ChatbotService initialized successfully");
    } catch (error) {
      console.error("Error initializing ChatbotService:", error);
      throw new Error("Failed to initialize ChatbotService");
    }
  }

  private getSystemPrompt(): string {
    const dataAtual = format(new Date(), "dd/MM/yyyy");
    const anoAtual = new Date().getFullYear();

    return `Você é Maria, assistente virtual da Artestofados, empresa especializada em fabricação, reforma e personalização de estofados em João Pessoa - PB.

Data de hoje: ${dataAtual}
Ano atual: ${anoAtual}

Atenda clientes com simpatia, focando em:
- Produtos e serviços de estofados
- Fabricação, reforma e personalização
- Informações da loja

Endereço: Av. Almirante Barroso, 389, Centro – João Pessoa – PB
Horário: Segunda a sexta, 08:00 às 18:00

Se o cliente falar de algo fora desses temas, redirecione com simpatia para nossos serviços.

FLUXO DE ATENDIMENTO:
1. Cumprimente e pergunte o nome
2. Identifique se quer FABRICAR ou REFORMAR
3. Para REFORMA: peça fotos e encerre
4. Para FABRICAÇÃO: pergunte tipo (sofá, poltrona, etc.)
5. Pergunte se tem projeto ou referência
6. Forneça informações sobre contato e horários
7. Encerre com simpatia

Não responda perguntas fora do contexto da empresa`;
  }

  private getConversationHistory(sessionId: string): ChatMessage[] {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, [
        {
          role: "system",
          content: this.getSystemPrompt(),
          timestamp: new Date(),
        },
      ]);
    }
    return this.conversationHistory.get(sessionId)!;
  }

  private addToHistory(sessionId: string, message: ChatMessage): void {
    const history = this.getConversationHistory(sessionId);
    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || new Date(),
    };

    history.push(messageWithTimestamp);

    // Maintain only the last N messages to save tokens
    if (history.length > this.maxHistoryLength) {
      // Keep system message and remove oldest user/assistant messages
      const systemMessage = history[0];
      const recentMessages = history.slice(-this.maxHistoryLength + 1);
      this.conversationHistory.set(sessionId, [
        systemMessage,
        ...recentMessages,
      ]);
    }
  }

  clearHistory(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }

  async sendMessage(sessionId: string, userMessage: string): Promise<string> {
    const startTime = Date.now();
    console.log(
      `Processing message for session ${sessionId}:`,
      userMessage.substring(0, 100)
    );

    try {
      // Get conversation history
      const history = this.getConversationHistory(sessionId);

      // Add user message to history
      this.addToHistory(sessionId, { role: "user", content: userMessage });

      // Check for image message
      if (this.isImageSent(userMessage)) {
        console.log("Detected image message");
        return await this.handleImageMessage(sessionId, userMessage);
      }

      // Process with OpenAI for general messages
      return await this.processWithOpenAI(sessionId, history);
    } catch (error) {
      console.error("Error processing message:", error);
      const errorMessage =
        "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.";
      this.addToHistory(sessionId, {
        role: "assistant",
        content: errorMessage,
      });
      return errorMessage;
    } finally {
      const duration = Date.now() - startTime;
      console.log(
        `Message processed in ${duration}ms for session ${sessionId}`
      );
    }
  }

  private async processWithOpenAI(
    sessionId: string,
    history: ChatMessage[]
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: history,
        temperature: 0.3,
        max_tokens: 800,
      });

      const assistantMessage =
        response.choices[0]?.message?.content ||
        "Desculpe, não consegui processar sua mensagem. Poderia reformular?";

      // Add assistant's response to history
      this.addToHistory(sessionId, {
        role: "assistant",
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error("Failed to process message with AI");
    }
  }

  private isImageSent(message: string): boolean {
    return (
      message.includes("[IMAGEM ENVIADA]") ||
      message.toLowerCase().includes("imagem enviada")
    );
  }

  private async handleImageMessage(
    sessionId: string,
    message: string
  ): Promise<string> {
    try {
      this.addToHistory(sessionId, {
        role: "user",
        content: "Cliente enviou uma imagem do estofado",
      });

      return (
        "Perfeito! Recebi sua foto do estofado. Vou analisar para preparar seu orçamento.\n\n" +
        "Entrarei em contato em breve com seu orçamento!"
      );
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      return "Desculpe, ocorreu erro ao processar sua imagem. Tente novamente.";
    }
  }
}

export default ChatbotService;
