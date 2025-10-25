const OrdemServico = require('../models/ordemServico');
const ItemOS = require('../models/itemOS');
const Cliente = require('../models/cliente');
const pdfService = require('../services/pdf');
const path = require('path');
const fs = require('fs').promises;

class OSController {
  async create(req, res) {
    try {
      const {
        cliente_nome,
        cliente_telefone,
        cliente_email,
        prazo_entrega,
        forma_pagamento,
        desconto_total,
        itens
      } = req.body;

      if (!cliente_nome || !cliente_telefone || !prazo_entrega || !itens || itens.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Dados obrigatórios não fornecidos'
        });
      }

      const cliente = await Cliente.getOrCreate(cliente_nome, cliente_telefone, cliente_email);

      let valor_total = itens.reduce((sum, item) => {
        const itemTotal = (item.quantidade * item.valor_unitario) - (item.desconto || 0);
        return sum + itemTotal;
      }, 0);

      valor_total -= (desconto_total || 0);

      const os = await OrdemServico.create({
        cliente_id: cliente.id,
        prazo_entrega,
        forma_pagamento,
        desconto_total: desconto_total || 0,
        valor_total,
        imagem_projeto: req.file ? `/uploads/${req.file.filename}` : null
      });

      for (const item of itens) {
        await ItemOS.create({
          os_id: os.id,
          ...item
        });
      }

      const osCompleta = await OrdemServico.getWithItems(os.id);

      res.status(201).json({
        success: true,
        message: 'Ordem de Serviço criada com sucesso',
        os: osCompleta
      });
    } catch (error) {
      console.error('Erro ao criar OS:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar Ordem de Serviço',
        error: error.message
      });
    }
  }

  async list(req, res) {
    try {
      const { limit = 100, offset = 0 } = req.query;

      const osList = await OrdemServico.list(parseInt(limit), parseInt(offset));

      res.json({
        success: true,
        count: osList.length,
        os: osList
      });
    } catch (error) {
      console.error('Erro ao listar OS:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar Ordens de Serviço',
        error: error.message
      });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;

      const os = await OrdemServico.getWithItems(id);

      if (!os) {
        return res.status(404).json({
          success: false,
          message: 'Ordem de Serviço não encontrada'
        });
      }

      res.json({
        success: true,
        os
      });
    } catch (error) {
      console.error('Erro ao buscar OS:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar Ordem de Serviço',
        error: error.message
      });
    }
  }

  async downloadPDF(req, res) {
    try {
      const { id } = req.params;

      const os = await OrdemServico.getWithItems(id);

      if (!os) {
        return res.status(404).json({
          success: false,
          message: 'Ordem de Serviço não encontrada'
        });
      }

      const fileName = `OS_${os.numero_os}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../../uploads', fileName);

      await pdfService.generateOS(os, os.itens, filePath);

      res.download(filePath, fileName, async (err) => {
        if (err) {
          console.error('Erro ao fazer download:', err);
        }
        try {
          await fs.unlink(filePath);
        } catch (unlinkError) {
          console.error('Erro ao deletar arquivo temporário:', unlinkError);
        }
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar PDF',
        error: error.message
      });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const os = await OrdemServico.update(id, updates);

      if (!os) {
        return res.status(404).json({
          success: false,
          message: 'Ordem de Serviço não encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Ordem de Serviço atualizada com sucesso',
        os
      });
    } catch (error) {
      console.error('Erro ao atualizar OS:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar Ordem de Serviço',
        error: error.message
      });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      await OrdemServico.delete(id);

      res.json({
        success: true,
        message: 'Ordem de Serviço deletada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar OS:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar Ordem de Serviço',
        error: error.message
      });
    }
  }
}

module.exports = new OSController();