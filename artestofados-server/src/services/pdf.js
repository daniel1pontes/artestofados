const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
  generateOS(os, itens, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        this.addHeader(doc);
        this.addTitle(doc);
        this.addTable(doc, itens);
        this.addTotals(doc, os);
        this.addClientInfo(doc, os);
        this.addSignatures(doc);

        doc.end();

        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  addHeader(doc) {
    doc.fontSize(20).text('ARTESTOFADOS', 50, 50);
    doc.fontSize(10).text('FOR HOME', 50, 75);
    doc.fontSize(9)
       .text('Artestofados', 400, 50)
       .text('Av. Almirante Barroso, 385, Centro – João Pessoa –PB', 400, 65)
       .text('CNPJ: 08.621.718/0001-07', 400, 80);
  }

  addTitle(doc) {
    doc.fontSize(16).text('ORDEM DE SERVIÇO', 50, 130, { align: 'center' });
    doc.moveDown(2);
  }

  addTable(doc, itens) {
    const tableTop = 180;
    const col1 = 50;
    const col2 = 120;
    const col3 = 330;
    const col4 = 430;

    doc.fontSize(9).font('Helvetica-Bold');
    doc.rect(col1, tableTop, 495, 20).stroke();
    doc.text('QUANTIDADE', col1 + 5, tableTop + 6);
    doc.text('DESCRIÇÃO', col2 + 5, tableTop + 6);
    doc.text('VALOR UNITÁRIO', col3 + 5, tableTop + 6);
    doc.text('VALOR TOTAL', col4 + 5, tableTop + 6);

    doc.font('Helvetica');
    let currentY = tableTop + 20;

    itens.forEach((item, index) => {
      const rowHeight = 30;
      doc.rect(col1, currentY, 495, rowHeight).stroke();

      doc.text(item.quantidade.toString(), col1 + 5, currentY + 10);
      doc.text(item.descricao, col2 + 5, currentY + 10, { width: 200 });
      doc.text(`R$ ${parseFloat(item.valor_unitario).toFixed(2)}`, col3 + 5, currentY + 10);
      doc.text(`R$ ${parseFloat(item.valor_total).toFixed(2)}`, col4 + 5, currentY + 10);

      currentY += rowHeight;
    });

    return currentY;
  }

  addTotals(doc, os) {
    const currentY = 180 + 20 + (30 * (os.itens?.length || 2));
    
    doc.fontSize(9).font('Helvetica-Bold');
    doc.rect(50, currentY, 495, 20).stroke();
    doc.text('VALOR TOTAL', 330, currentY + 6);
    doc.text(`R$ ${parseFloat(os.valor_total).toFixed(2)}`, 430, currentY + 6);
  }

  addClientInfo(doc, os) {
    const infoY = 400;
    
    doc.fontSize(10).font('Helvetica');
    doc.text(`Cliente: ${os.cliente_nome}`, 50, infoY);
    doc.text(`Prazo de entrega: ${new Date(os.prazo_entrega).toLocaleDateString('pt-BR')}`, 50, infoY + 15);
    doc.text(`Forma de Pagamento: ${os.forma_pagamento || 'A vista'}`, 50, infoY + 30);
  }

  addSignatures(doc) {
    const signY = 650;
    
    doc.fontSize(10);
    doc.text('_________________________', 80, signY);
    doc.text('Artestofados', 120, signY + 20);

    doc.text('_________________________', 320, signY);
    doc.text('Cliente', 380, signY + 20);

    doc.fontSize(8).text(`João Pessoa, ${new Date().toLocaleDateString('pt-BR')}`, 400, signY + 50);
  }
}

module.exports = new PDFService();