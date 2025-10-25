const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const SessaoChatbot = require('../models/SessaoChatbot');
const { chat } = require('../config/openai');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.qrCode = null;
    this.isReady = false;
    this.isPaused = false;
  }

  initialize() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'artestofados',
        dataPath: process.env.WHATSAPP_SESSION_PATH || './sessions'
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this.client.on('qr', async (qr) => {
      console.log('📱 QR Code gerado');
      this.qrCode = await qrcode.toDataURL(qr);
    });

    this.client.on('ready', () => {
      console.log('✅ WhatsApp conectado!');
      this.isReady = true;
      this.qrCode = null;
    });

    this.client.on('message', async (message) => {
      if (this.isPaused) return;
      await this.handleMessage(message);
    });

    this.client.on('disconnected', () => {
      console.log('❌ WhatsApp desconectado');
      this.isReady = false;
      this.qrCode = null;
    });

    this.client.initialize();
  }

  async handleMessage(message) {
    try {
      if (message.from === 'status@broadcast') return;

      const telefone = message.from.replace('@c.us', '');
      const sessao = await SessaoChatbot.getOrCreate(telefone);

      await SessaoChatbot.addMessage(sessao.id, 'user', message.body);

      const mensagens = sessao.mensagens || [];
      mensagens.push({ role: 'user', content: message.body });

      const resposta = await chat(mensagens);

      await message.reply(resposta);
      await SessaoChatbot.addMessage(sessao.id, 'assistant', resposta);

      await this.updateSessionState(sessao, message.body, resposta);

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      await message.reply('Desculpe, ocorreu um erro. Por favor, tente novamente.');
    }
  }

  async updateSessionState(sessao, userMessage, botResponse) {
    const lowerMessage = userMessage.toLowerCase();
    const lowerResponse = botResponse.toLowerCase();

    const updates = {};

    if (lowerMessage.includes('reforma') || lowerResponse.includes('reforma')) {
      updates.tipo_servico = 'reforma';
    } else if (lowerMessage.includes('fabricação') || lowerMessage.includes('fabricacao')) {
      updates.tipo_servico = 'fabricacao';
    }

    if (lowerMessage.includes('sofá') || lowerMessage.includes('sofa')) {
      updates.tipo_estofado = 'sofa';
    } else if (lowerMessage.includes('cadeira')) {
      updates.tipo_estofado = 'cadeira';
    } else if (lowerMessage.includes('poltrona')) {
      updates.tipo_estofado = 'poltrona';
    } else if (lowerMessage.includes('cama')) {
      updates.tipo_estofado = 'cama';
    }

    if (lowerMessage.includes('sim') && lowerResponse.includes('projeto')) {
      updates.tem_projeto = true;
    } else if (lowerMessage.includes('não') || lowerMessage.includes('nao')) {
      updates.tem_projeto = false;
    }

    if (lowerMessage.includes('sim') && (lowerResponse.includes('reunião') || lowerResponse.includes('visita'))) {
      updates.quer_visita = true;
    }

    if (Object.keys(updates).length > 0) {
      await SessaoChatbot.update(sessao.id, updates);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
      this.qrCode = null;
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  getStatus() {
    return {
      isReady: this.isReady,
      isPaused: this.isPaused,
      qrCode: this.qrCode
    };
  }
}

module.exports = new WhatsAppService();