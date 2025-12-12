import { Client, LocalAuth, Message } from "whatsapp-web.js";
import { PrismaClient } from "@prisma/client";
import QRCode from "qrcode";
import ChatbotOrchestratorService from "./ChatbotOrchestratorService";

const prisma = new PrismaClient();

class WhatsAppService {
  private client: Client | null = null;
  private qrCode: string | null = null;
  private chatbotOrchestrator: ChatbotOrchestratorService;
  private botEnabled: boolean = false;
  private connectionAttempts: number = 0;
  private readonly maxConnectionAttempts: number = 3;

  constructor() {
    this.chatbotOrchestrator = new ChatbotOrchestratorService();
    this.botEnabled = true; // Bot começa ativado por padrão
    this.initializeClient();
  }

  private initializeClient() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "main-session",
      }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
        ],
        defaultViewport: null,
      },
      webVersionCache: {
        type: "none",
      },
    });

    this.client.on("qr", async (qr) => {
      console.log("QR Code recebido:", qr);

      // Converter QR Code para imagem base64
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(qr, {
          width: 200,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });

        // Extrair apenas a parte base64 do data URL
        this.qrCode = qrCodeDataUrl.split(",")[1];
        this.updateDatabaseStatus("PAUSED", this.qrCode);
      } catch (error) {
        console.error("Erro ao converter QR Code:", error);
        this.qrCode = qr;
        this.updateDatabaseStatus("PAUSED", qr);
      }
    });

    this.client.on("ready", async () => {
      console.log("Cliente WhatsApp está pronto!");
      this.qrCode = null;
      const phoneNumber = this.client?.info?.wid?.user || null;
      await this.updateDatabaseStatus("CONNECTED", undefined, phoneNumber);

      // Ativar o bot automaticamente quando conectar
      if (!this.botEnabled) {
        this.enableBot();
        console.log("Bot ativado automaticamente na conexão");
      }
    });

    this.client.on("authenticated", async () => {
      console.log("Cliente autenticado!");
      const phoneNumber = this.client?.info?.wid?.user || null;
      await this.updateDatabaseStatus("CONNECTED", undefined, phoneNumber);

      // Ativar o bot automaticamente quando autenticar
      if (!this.botEnabled) {
        this.enableBot();
        console.log("Bot ativado automaticamente na autenticação");
      }
    });

    this.client.on("auth_failure", (msg) => {
      console.error("Falha na autenticação:", msg);
      this.updateDatabaseStatus("DISCONNECTED");
    });

    this.client.on("disconnected", (reason) => {
      console.log("Cliente desconectado:", reason);
      this.updateDatabaseStatus("DISCONNECTED");

      // Desativar o bot quando desconectar
      this.disableBot();
      console.log("Bot desativado automaticamente na desconexão");
    });

    // Event listener para mensagens
    this.client.on("message", async (message: Message) => {
      await this.handleMessage(message);
    });
  }

  private async handleMessage(message: Message) {
    try {
      // Ignorar mensagens se o bot estiver desativado
      if (!this.botEnabled) {
        return;
      }

      const chat = await message.getChat();

      // Verificar se é um grupo e ignorar
      if (chat.isGroup) {
        console.log(`Mensagem de grupo ignorada: ${chat.name}`);
        return;
      }

      // Extrair número do telefone
      const phoneNumber = message.from.replace("@c.us", "").replace("@g.us", "");

      // NOVA LÓGICA: Detectar interferência humana
      // Se a mensagem foi enviada pelo número conectado (fromMe = true),
      // significa que um atendente respondeu manualmente
      if (message.fromMe) {
        console.log(`🚨 Interferência humana detectada para ${phoneNumber}`);
        await this.handleHumanIntervention(phoneNumber);
        return; // Não processar mensagem do próprio atendente
      }

      // NOVA LÓGICA: Verificar se a conversa está pausada
      const isPaused = await this.chatbotOrchestrator.isConversationPaused(phoneNumber);
      if (isPaused) {
        const remainingMinutes = await this.chatbotOrchestrator.getPauseTimeRemaining(phoneNumber);
        console.log(
          `⏸️ Conversa pausada para ${phoneNumber}. Tempo restante: ${remainingMinutes} minutos`
        );
        return; // Não responder, chatbot está pausado
      }

      // Processar mensagem de chat privado
      let messageBody = message.body;

      // Se for mensagem de mídia, adicionar indicação
      if (message.hasMedia) {
        messageBody = messageBody || "";
        messageBody += " [IMAGEM ENVIADA]";
        console.log(
          `Processando mensagem com mídia de ${message.from}: ${messageBody}`
        );
      }

      if (!messageBody || messageBody.trim() === "") {
        return;
      }

      console.log(`Processando mensagem de ${message.from}: ${messageBody}`);

      // Processar mensagem usando o orquestrador (que cria agendamentos automaticamente)
      const response = await this.chatbotOrchestrator.processMessage(
        phoneNumber,
        messageBody
      );

      // Enviar resposta
      await message.reply(response.message);

      // Log adicional se agendamento foi criado
      if (response.appointmentCreated) {
        console.log(`✅ Agendamento criado via WhatsApp:`, {
          appointmentId: response.appointmentId,
          phoneNumber,
        });
      }

      console.log(`Resposta enviada para ${message.from}: ${response.message}`);
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
    }
  }

  private async updateDatabaseStatus(
    status: string,
    qrCode?: string,
    phoneNumber?: string | null
  ) {
    try {
      await prisma.whatsappConn.upsert({
        where: { id: "main" },
        update: {
          status: status as any,
          qrCode: qrCode || null,
          phone: phoneNumber || null,
          connectedAt: status === "CONNECTED" ? new Date() : null,
        },
        create: {
          id: "main",
          status: status as any,
          qrCode: qrCode || null,
          phone: phoneNumber || null,
        },
      });
    } catch (error) {
      console.error("Erro ao atualizar status no banco:", error);
    }
  }

  async connect(): Promise<string | null> {
    if (!this.client) {
      throw new Error("Cliente WhatsApp não inicializado");
    }

    // Incrementar tentativas
    this.connectionAttempts++;

    if (this.connectionAttempts > this.maxConnectionAttempts) {
      this.connectionAttempts = 0; // Resetar para próximas tentativas
      throw new Error(
        "Número máximo de tentativas de conexão atingido. Por favor, tente novamente em alguns minutos."
      );
    }

    try {
      await this.client.initialize();

      // Resetar contador em caso de sucesso
      this.connectionAttempts = 0;

      // Se já tiver um QR Code, retorna ele
      if (this.qrCode) {
        return this.qrCode;
      }

      // Senão, espera um pouco pelo QR Code
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout ao esperar QR Code"));
        }, 45000); // Aumentado para 45 segundos

        const checkQrCode = () => {
          if (this.qrCode) {
            clearTimeout(timeout);
            resolve(this.qrCode);
          } else {
            setTimeout(checkQrCode, 1000);
          }
        };

        // Adicionar listener para erro
        this.client?.on("auth_failure", () => {
          clearTimeout(timeout);
          reject(new Error("Falha na autenticação"));
        });

        checkQrCode();
      });
    } catch (error: any) {
      console.error("Erro ao conectar WhatsApp:", error);

      // Se for erro de VERSION ou context destroyed, tentar reconstruir o cliente
      if (
        error.message?.includes("VERSION") ||
        error.message?.includes("context was destroyed") ||
        error.originalMessage?.includes("context was destroyed")
      ) {
        console.log(
          "Tentando reconstruir cliente devido a erro de contexto/versão..."
        );
        this.client = null;
        this.qrCode = null;

        // Limpar cache antes de reconstruir
        const fs = require("fs");
        const path = require("path");
        const cachePath = path.join(process.cwd(), ".wwebjs_cache");
        if (fs.existsSync(cachePath)) {
          try {
            fs.rmSync(cachePath, { recursive: true, force: true });
            console.log("Cache limpo para reconstrução");
          } catch (err) {
            console.error("Erro ao limpar cache:", err);
          }
        }

        // Aguardar um pouco antes de reconstruir
        await new Promise((resolve) => setTimeout(resolve, 2000));

        this.initializeClient();

        // Tentar novamente após reconstruir
        return this.connect();
      }

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        // Fazer logout se o cliente estiver conectado
        if (this.client.info) {
          await this.client.logout();
        }

        // Destruir o cliente
        await this.client.destroy();
      } catch (error) {
        console.error("Erro ao desconectar WhatsApp:", error);
      } finally {
        // Limpar arquivos de sessão local
        const fs = require("fs");
        const path = require("path");
        const sessionPath = path.join(
          process.cwd(),
          ".wwebjs_auth",
          "session-main-session"
        );

        if (fs.existsSync(sessionPath)) {
          try {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log("Sessão local limpa com sucesso");
          } catch (error) {
            console.error("Erro ao limpar sessão local:", error);
          }
        }

        // Limpar cache
        const cachePath = path.join(process.cwd(), ".wwebjs_cache");
        if (fs.existsSync(cachePath)) {
          try {
            fs.rmSync(cachePath, { recursive: true, force: true });
            console.log("Cache limpo com sucesso");
          } catch (error) {
            console.error("Erro ao limpar cache:", error);
          }
        }

        // Resetar variáveis
        this.client = null;
        this.qrCode = null;

        // Desativar o bot
        this.disableBot();

        // Atualizar status no banco
        await this.updateDatabaseStatus("DISCONNECTED");

        // Recriar cliente para próxima conexão
        this.initializeClient();
      }
    }
  }

  async getStatus() {
    try {
      const connection = await prisma.whatsappConn.findFirst({
        where: { id: "main" },
      });

      return {
        id: connection?.id || "main",
        status: connection?.status || "DISCONNECTED",
        phoneNumber: connection?.phone,
        qrCode: connection?.qrCode,
        connectedAt: connection?.connectedAt,
      };
    } catch (error) {
      console.error("Erro ao buscar status:", error);
      return {
        id: "main",
        status: "DISCONNECTED",
      };
    }
  }

  async isConnected(): Promise<boolean> {
    return this.client ? this.client.info !== null : false;
  }

  /**
   * Trata interferência humana pausando o chatbot por 2 horas
   */
  private async handleHumanIntervention(phoneNumber: string): Promise<void> {
    try {
      // Pausar por 2 horas
      await this.chatbotOrchestrator.pauseConversation(phoneNumber, 2);
      
      console.log(
        `✅ Chatbot pausado por 2 horas para ${phoneNumber} devido à interferência humana`
      );
    } catch (error) {
      console.error(
        `Erro ao pausar chatbot para ${phoneNumber}:`,
        error
      );
    }
  }

  // Métodos para controlar o bot
  enableBot(): void {
    this.botEnabled = true;
    console.log("Bot ativado - responderá apenas mensagens privadas");
  }

  disableBot(): void {
    this.botEnabled = false;
    console.log("Bot desativado - não responderá nenhuma mensagem");
  }

  isBotEnabled(): boolean {
    return this.botEnabled;
  }
}

export default WhatsAppService;
