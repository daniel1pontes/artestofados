import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import ChatbotOrchestratorService from "../services/ChatbotOrchestratorService";
import { z } from "zod";

const router = Router();
const chatbotOrchestrator = new ChatbotOrchestratorService();

// Schema para validação
const messageSchema = z.object({
  message: z.string().min(1, "Mensagem é obrigatória"),
  phoneNumber: z.string().min(1, "Número de telefone é obrigatório"),
});

// Enviar mensagem para o chatbot
router.post("/message", authenticateToken, async (req, res) => {
  try {
    const { message, phoneNumber } = messageSchema.parse(req.body);

    const response = await chatbotOrchestrator.processMessage(phoneNumber, message);

    res.json({
      success: true,
      message: response.message,
      intent: response.intent,
      appointmentCreated: response.appointmentCreated || false,
      appointmentId: response.appointmentId,
      phoneNumber,
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
router.delete("/history/:phoneNumber", authenticateToken, async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    await chatbotOrchestrator.clearHistory(phoneNumber);

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

// Pausar conversa manualmente
router.post("/conversations/:phoneNumber/pause", authenticateToken, async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { hours = 2 } = req.body;

    await chatbotOrchestrator.pauseConversation(phoneNumber, hours);

    res.json({
      success: true,
      message: `Conversa pausada por ${hours} horas`,
      phoneNumber,
      hours,
    });
  } catch (error) {
    console.error("Erro ao pausar conversa:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao pausar conversa",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// Despausar conversa manualmente
router.post("/conversations/:phoneNumber/unpause", authenticateToken, async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    await chatbotOrchestrator.unpauseConversation(phoneNumber);

    res.json({
      success: true,
      message: "Conversa despausada com sucesso",
      phoneNumber,
    });
  } catch (error) {
    console.error("Erro ao despausar conversa:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao despausar conversa",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// Verificar status da pausa
router.get("/conversations/:phoneNumber/pause-status", authenticateToken, async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const isPaused = await chatbotOrchestrator.isConversationPaused(phoneNumber);
    const remainingMinutes = await chatbotOrchestrator.getPauseTimeRemaining(phoneNumber);

    res.json({
      success: true,
      phoneNumber,
      isPaused,
      remainingMinutes,
      remainingHours: remainingMinutes ? Math.ceil(remainingMinutes / 60) : null,
    });
  } catch (error) {
    console.error("Erro ao verificar status da pausa:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao verificar status da pausa",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

export default router;
