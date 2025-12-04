import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import ChatbotService from "../services/ChatbotService";
import { z } from "zod";

const router = Router();
const chatbotService = new ChatbotService();

// Schema para validação
const messageSchema = z.object({
  message: z.string().min(1, "Mensagem é obrigatória"),
  sessionId: z.string().min(1, "Sessão é obrigatória"),
});

// Enviar mensagem para o chatbot
router.post("/message", authenticateToken, async (req, res) => {
  try {
    const { message, sessionId } = messageSchema.parse(req.body);

    const response = await chatbotService.sendMessage(sessionId, message);

    res.json({
      success: true,
      message: response,
      sessionId,
    });
  } catch (error) {
    console.error("Erro ao processar mensagem do chatbot:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao processar mensagem",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// Limpar histórico de conversa
router.delete("/history/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    chatbotService.clearHistory(sessionId);

    res.json({
      success: true,
      message: "Histórico limpo com sucesso",
    });
  } catch (error) {
    console.error("Erro ao limpar histórico:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao limpar histórico",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

export default router;
