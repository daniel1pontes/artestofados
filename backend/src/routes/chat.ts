import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Obter histórico de mensagens de uma sessão
router.get(
  "/sessions/:sessionId/messages",
  authenticateToken,
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      const messages = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { timestamp: "asc" },
      });

      res.json(messages);
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
      res.status(500).json({ error: "Erro ao buscar mensagens" });
    }
  }
);

// Listar sessões ativas
router.get("/sessions", authenticateToken, async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    res.json(sessions);
  } catch (error) {
    console.error("Erro ao listar sessões:", error);
    res.status(500).json({ error: "Erro ao listar sessões" });
  }
});

// Enviar mensagem via API
router.post("/send", authenticateToken, async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res
        .status(400)
        .json({ error: "ID da sessão e mensagem são obrigatórios" });
    }

    // Aqui você pode adicionar lógica para processar a mensagem com IA
    // e enviar a resposta via WhatsApp

    res.json({ success: true, message: "Mensagem processada com sucesso" });
  } catch (error) {
    console.error("Erro ao processar mensagem:", error);
    res.status(500).json({ error: "Erro ao processar mensagem" });
  }
});

export default router;
