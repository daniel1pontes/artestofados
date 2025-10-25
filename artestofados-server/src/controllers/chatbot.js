const whatsappService = require('../services/whatsapp');
const SessaoChatbot = require('../models/SessaoChatbot');

class ChatbotController {
  async connect(req, res) {
    try {
      if (whatsappService.isReady) {
        return res.json({
          success: false,
          message: 'WhatsApp já está conectado'
        });
      }

      whatsappService.initialize();

      res.json({
        success: true,
        message: 'Inicializando conexão. Aguarde o QR Code.'
      });
    } catch (error) {
      console.error('Erro ao conectar WhatsApp:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao conectar WhatsApp',
        error: error.message
      });
    }
  }

  async getQRCode(req, res) {
    try {
      const status = whatsappService.getStatus();

      res.json({
        success: true,
        qrCode: status.qrCode,
        isReady: status.isReady
      });
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter QR Code',
        error: error.message
      });
    }
  }

  async disconnect(req, res) {
    try {
      await whatsappService.disconnect();

      res.json({
        success: true,
        message: 'WhatsApp desconectado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao desconectar WhatsApp',
        error: error.message
      });
    }
  }

  async pause(req, res) {
    try {
      whatsappService.pause();

      res.json({
        success: true,
        message: 'Atendimento pausado'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao pausar atendimento',
        error: error.message
      });
    }
  }

  async resume(req, res) {
    try {
      whatsappService.resume();

      res.json({
        success: true,
        message: 'Atendimento retomado'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao retomar atendimento',
        error: error.message
      });
    }
  }

  async getStatus(req, res) {
    try {
      const status = whatsappService.getStatus();

      res.json({
        success: true,
        status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao obter status',
        error: error.message
      });
    }
  }

  async getSessions(req, res) {
    try {
      const sessions = await SessaoChatbot.listActive();

      res.json({
        success: true,
        sessions
      });
    } catch (error) {
      console.error('Erro ao listar sessões:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar sessões',
        error: error.message
      });
    }
  }
}

module.exports = new ChatbotController();