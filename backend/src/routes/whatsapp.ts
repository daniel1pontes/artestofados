import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import WhatsAppService from "../services/WhatsAppService";

const router = Router();
const whatsappService = new WhatsAppService();

// Status da conexão WhatsApp
router.get("/status", authenticateToken, async (req, res) => {
  try {
    const status = await whatsappService.getStatus();
    res.json({
      ...status,
      botEnabled: whatsappService.isBotEnabled(),
    });
  } catch (error) {
    console.error("Erro ao buscar status do WhatsApp:", error);
    res.status(500).json({ error: "Erro ao buscar status" });
  }
});

// Conectar WhatsApp
router.post("/connect", authenticateToken, async (req, res) => {
  try {
    const qrCode = await whatsappService.connect();

    res.json({
      success: true,
      message: "QR Code gerado com sucesso",
      qrCode: qrCode,
    });
  } catch (error) {
    console.error("Erro ao conectar WhatsApp:", error);
    res.status(500).json({ error: "Erro ao conectar WhatsApp" });
  }
});

// Desconectar WhatsApp
router.post("/disconnect", authenticateToken, async (req, res) => {
  try {
    await whatsappService.disconnect();
    res.json({
      success: true,
      message: "WhatsApp desconectado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao desconectar WhatsApp:", error);
    res.status(500).json({ error: "Erro ao desconectar WhatsApp" });
  }
});

// Ativar/Desativar bot
router.post("/toggle", authenticateToken, async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res
        .status(400)
        .json({ error: "Parâmetro 'enabled' é obrigatório" });
    }

    // Ativar ou desativar o bot
    if (enabled) {
      whatsappService.enableBot();
    } else {
      whatsappService.disableBot();
    }

    res.json({
      success: true,
      message: `Bot ${enabled ? "ativado" : "desativado"} com sucesso`,
      enabled,
      botStatus: whatsappService.isBotEnabled(),
    });
  } catch (error) {
    console.error("Erro ao alterar status do bot:", error);
    res.status(500).json({ error: "Erro ao alterar status do bot" });
  }
});

// Listar sessões do WhatsApp
router.get("/sessions", authenticateToken, async (req, res) => {
  try {
    // Retornar sessões mock para teste
    const mockSessions = [
      {
        id: "session_1",
        phoneNumber: "+55 83 99999-9999",
        lastMessage: "Olá! Gostaria de fazer um orçamento",
        timestamp: new Date().toISOString(),
        unreadCount: 2,
      },
      {
        id: "session_2",
        phoneNumber: "+55 83 88888-8888",
        lastMessage: "Qual o valor para reformar uma poltrona?",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        unreadCount: 0,
      },
    ];

    res.json({ sessions: mockSessions });
  } catch (error) {
    console.error("Erro ao listar sessões:", error);
    res.status(500).json({ error: "Erro ao listar sessões" });
  }
});

export default router;
