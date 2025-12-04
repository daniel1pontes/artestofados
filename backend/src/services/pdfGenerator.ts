import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import sizeOf from "image-size";

export interface OrderServiceData {
  id: string;
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  deliveryDeadline?: string;
  paymentMethod?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitValue: number;
    total: number;
    discount?: number;
  }>;
  images?: Array<{
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }>; // Agora recebe buffers diretamente
  discount: number;
  total: number;
  createdAt: Date;
}

class PDFService {
  private uploadsDir: string;
  private assetsDir: string;
  private logoPath: string;

  constructor() {
    // Configuração de diretórios (ajustada para o ambiente simulado, mantendo a estrutura original)
    this.uploadsDir = path.join(process.cwd(), "uploads");
    this.assetsDir = path.join(
      process.cwd(),
      "..",
      "frontend",
      "public",
      "images"
    );
    this.logoPath = path.join(this.assetsDir, "logo.png");
    this.ensureDirectories();
  }

  private ensureDirectories() {
    // Estas funções de manipulação de arquivo assumem um ambiente Node.js.
    // Manter a estrutura para compatibilidade com o código original.
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(this.assetsDir)) {
      fs.mkdirSync(this.assetsDir, { recursive: true });
    }
  }

  private formatarData(data?: string): string {
    if (!data) return "";

    // Se já está no formato DD/MM/YYYY, retorna como está
    if (typeof data === "string" && data.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return data;
    }

    try {
      const dataObj = new Date(data);

      if (isNaN(dataObj.getTime())) {
        return data;
      }

      const dia = String(dataObj.getDate()).padStart(2, "0");
      const mes = String(dataObj.getMonth() + 1).padStart(2, "0");
      const ano = dataObj.getFullYear();

      return `${dia}/${mes}/${ano}`;
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return data;
    }
  }

  private formatarMoeda(valor: number): string {
    // Garante que o valor é um número finito antes de formatar
    const num = isFinite(valor) ? parseFloat(valor.toString()) : 0;
    return num.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  private adicionarCabecalho(doc: PDFKit.PDFDocument) {
    // Tentar adicionar logo, mas não quebrar se não existir
    try {
      if (fs.existsSync(this.logoPath)) {
        doc.image(this.logoPath, 50, 40, { width: 100 });
        console.log("✅ Logo carregada");
      } else {
        console.warn("⚠️ Logo não encontrada, continuando sem logo");
      }
    } catch (error) {
      console.warn("⚠️ Erro ao carregar logo, continuando sem logo:", error);
    }

    // Cabeçalho da empresa
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Artestofados", 170, 45)
      .fontSize(10)
      .font("Helvetica")
      .text("AV: Almirante Barroso, 389, Centro – João Pessoa –PB", 170, 65)
      .text("CNPJ: 08.621.718/0001-07", 170, 80);

    // Título da OS
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("ORDEM DE SERVIÇO", 50, 110, { align: "center", width: 495 });

    doc.moveDown(1);
  }

  /**
   * Calcula as larguras de coluna com base no conteúdo para otimizar o espaço.
   * A coluna 'DESCRIÇÃO' recebe todo o espaço restante.
   */
  private calcularLarguraColunas(
    doc: PDFKit.PDFDocument,
    items: any[],
    hasItemDiscount: boolean
  ) {
    const larguraTotalMaxima = 495;
    const padding = 8; // Aumentado padding
    const minDescricaoWidth = 150; // Aumentado largura mínima

    // 1. Definir larguras mínimas para as colunas de dados com base nos cabeçalhos
    doc.font("Helvetica").fontSize(9);

    const largurasCalculadas = {
      qtd: Math.max(doc.widthOfString("QTD") + padding, 40), // Mínimo 40px
      unitario: Math.max(doc.widthOfString("VALOR UNIT.") + padding, 80), // Mínimo 80px
      desconto: hasItemDiscount
        ? Math.max(doc.widthOfString("DESC. (%)") + padding, 60)
        : 0, // Mínimo 60px
      total: Math.max(doc.widthOfString("VALOR TOTAL") + padding, 80), // Mínimo 80px
      descricao: 0, // Será calculado
    };

    // 2. Analisar conteúdo das colunas para ajustar larguras mínimas
    doc.font("Helvetica").fontSize(10);
    items.forEach((item) => {
      // QTD
      const qtdWidth = doc.widthOfString(item.quantity.toString()) + padding;
      largurasCalculadas.qtd = Math.max(largurasCalculadas.qtd, qtdWidth);

      // VALOR UNIT.
      const unitValue = parseFloat(item.unitValue.toString());
      const unitWidth =
        doc.widthOfString(this.formatarMoeda(unitValue)) + padding;
      largurasCalculadas.unitario = Math.max(
        largurasCalculadas.unitario,
        unitWidth
      );

      // DESC. (%)
      if (hasItemDiscount) {
        const discountItem = parseFloat((item.discount || 0).toString());
        const discountText = discountItem > 0 ? `${discountItem}%` : "-";
        const discountWidth = doc.widthOfString(discountText) + padding;
        largurasCalculadas.desconto = Math.max(
          largurasCalculadas.desconto,
          discountWidth
        );
      }

      // VALOR TOTAL
      const valorFinal = parseFloat(item.total.toString());
      const totalWidth =
        doc.widthOfString(this.formatarMoeda(valorFinal)) + padding;
      largurasCalculadas.total = Math.max(largurasCalculadas.total, totalWidth);
    });

    // 3. Somar larguras fixas (QTD + UNIT + DESC + TOTAL)
    const larguraFixaTotal =
      largurasCalculadas.qtd +
      largurasCalculadas.unitario +
      largurasCalculadas.desconto +
      largurasCalculadas.total;

    // 4. Calcular largura da DESCRIÇÃO (o restante do espaço)
    let larguraDescricao = larguraTotalMaxima - larguraFixaTotal;

    // Se a largura calculada for muito pequena (ou negativa), garante o mínimo
    largurasCalculadas.descricao = Math.max(
      minDescricaoWidth,
      larguraDescricao
    );

    // Se o espaço restante for positivo e suficiente, ajusta a largura da descrição
    if (larguraDescricao > minDescricaoWidth) {
      largurasCalculadas.descricao = larguraDescricao;
    }

    // 5. Construir estrutura final de colunas
    const colunasFinais = [
      { header: "QTD", width: Math.ceil(largurasCalculadas.qtd) },
      { header: "DESCRIÇÃO", width: Math.ceil(largurasCalculadas.descricao) },
      { header: "VALOR UNIT.", width: Math.ceil(largurasCalculadas.unitario) },
    ];

    if (hasItemDiscount) {
      colunasFinais.push({
        header: "DESC. (%)",
        width: Math.ceil(largurasCalculadas.desconto),
      });
    }

    colunasFinais.push({
      header: "VALOR TOTAL",
      width: Math.ceil(largurasCalculadas.total),
    });

    console.log(
      "📊 Larguras calculadas:",
      colunasFinais.map((c) => `${c.header}: ${c.width}px`).join(", ")
    );
    console.log(
      "📊 Total:",
      colunasFinais.reduce((sum, c) => sum + c.width, 0),
      "px (máximo:",
      larguraTotalMaxima,
      "px)"
    );

    // Se o arredondamento fez com que o total ficasse ligeiramente menor que 495 (e não maior),
    // adicionamos a diferença na descrição (a coluna flexível) para preencher 495.
    const diferenca =
      larguraTotalMaxima - colunasFinais.reduce((sum, c) => sum + c.width, 0);
    if (diferenca > 0.01) {
      // 0.01 para evitar problemas de ponto flutuante
      const descricaoCol = colunasFinais.find((c) => c.header === "DESCRIÇÃO");
      if (descricaoCol) {
        descricaoCol.width += diferenca;
      }
    }

    return colunasFinais;
  }

  private adicionarTabelaItens(
    doc: PDFKit.PDFDocument,
    dados: OrderServiceData
  ) {
    const margemEsq = 50;
    const larguraTotal = 495;
    const hasItemDiscount = dados.items.some(
      (it) => parseFloat((it.discount || 0).toString()) > 0
    );

    // Calcular larguras de coluna baseadas no conteúdo
    const colunas = this.calcularLarguraColunas(
      doc,
      dados.items,
      hasItemDiscount
    );

    let currentY = doc.y;
    const headerHeight = 25;

    // ========== CABEÇALHO DA TABELA ==========
    doc.rect(margemEsq, currentY, larguraTotal, headerHeight).stroke();

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000");
    let posX = margemEsq;

    colunas.forEach((col, index) => {
      // Desenhar linha vertical entre colunas
      if (index > 0) {
        doc
          .moveTo(posX, currentY)
          .lineTo(posX, currentY + headerHeight)
          .stroke();
      }

      doc.text(col.header, posX + 3, currentY + 8, {
        width: col.width - 6,
        align: "center",
      });
      posX += col.width;
    });

    currentY += headerHeight;
    doc.font("Helvetica").fontSize(9);

    // ========== LINHAS DOS ITENS ==========
    dados.items.forEach((item) => {
      // Garantir que os valores são numéricos
      const quantity = parseFloat(item.quantity.toString());
      const unitValue = parseFloat(item.unitValue.toString());
      const discountItem = parseFloat((item.discount || 0).toString());

      const valorBruto = quantity * unitValue;
      let valorFinal = valorBruto;

      // Aplicar desconto do item se houver
      if (discountItem > 0) {
        const valorDesconto = (valorBruto * discountItem) / 100;
        valorFinal = valorBruto - valorDesconto;
      }

      // Calcular altura necessária para a descrição (coluna 1)
      const descricaoCol = colunas[1];
      const descricaoText = item.name;
      const descricaoOptions = {
        width: descricaoCol.width - 10, // Largura da coluna de descrição - padding
        align: "left" as const,
        lineGap: 2,
      };

      // Medir a altura do texto da descrição
      doc.fontSize(9).font("Helvetica");
      const descricaoHeight = doc.heightOfString(
        descricaoText,
        descricaoOptions
      );

      // Altura base e Altura final da linha
      const alturaMinima = 25; // Altura mínima para uma linha
      const alturaConteudo = descricaoHeight + 10; // 10px de margem vertical
      const alturaLinha = Math.max(alturaMinima, alturaConteudo);

      // Nova página se necessário
      if (currentY + alturaLinha > 700) {
        doc.addPage();
        currentY = 50;
      }

      // Linha horizontal
      doc.rect(margemEsq, currentY, larguraTotal, alturaLinha).stroke();

      // Conteúdo da linha
      posX = margemEsq;

      colunas.forEach((col, index) => {
        // Desenhar linha vertical entre colunas
        if (index > 0) {
          doc
            .moveTo(posX, currentY)
            .lineTo(posX, currentY + alturaLinha)
            .stroke();
        }

        let texto = "";
        let textOptions: any = {
          width: col.width - 6, // Subtrai padding
          align: "center",
          lineGap: 2, // Espaçamento entre linhas
          ellipsis: "...",
        };

        if (hasItemDiscount) {
          switch (index) {
            case 0: // QTD
              texto = item.quantity.toString();
              textOptions.align = "center";
              break;
            case 1: // DESCRIÇÃO
              texto = item.name;
              textOptions.align = "left";
              textOptions.width = col.width - 10; // Um pouco mais de padding
              break;
            case 2: // VALOR UNIT.
              texto = this.formatarMoeda(unitValue);
              textOptions.align = "right";
              break;
            case 3: // DESC. (%)
              texto = discountItem > 0 ? `${discountItem}%` : "-";
              textOptions.align = "center";
              break;
            case 4: // VALOR TOTAL
              texto = this.formatarMoeda(valorFinal);
              textOptions.align = "right";
              break;
          }
        } else {
          switch (index) {
            case 0: // QTD
              texto = item.quantity.toString();
              textOptions.align = "center";
              break;
            case 1: // DESCRIÇÃO
              texto = item.name;
              textOptions.align = "left";
              textOptions.width = col.width - 10;
              break;
            case 2: // VALOR UNIT.
              texto = this.formatarMoeda(unitValue);
              textOptions.align = "right";
              break;
            case 3: // VALOR TOTAL
              texto = this.formatarMoeda(valorFinal);
              textOptions.align = "right";
              break;
          }
        }

        // Alinhar verticalmente o texto no centro da linha
        const textHeight = doc.heightOfString(texto, textOptions);
        const verticalOffset = Math.max(3, (alturaLinha - textHeight) / 2); // 3px de padding top mínimo

        doc.text(texto, posX + 3, currentY + verticalOffset, textOptions);

        posX += col.width;
      });

      currentY += alturaLinha;
    });

    // ========== CÁLCULOS FINAIS ==========
    const alturaLinha = 25;

    let subtotalBruto = 0;
    let descontoTotalItens = 0;

    dados.items.forEach((item) => {
      const quantity = parseFloat(item.quantity.toString());
      const unitValue = parseFloat(item.unitValue.toString());
      const discountItem = parseFloat((item.discount || 0).toString());

      const valorBrutoItem = quantity * unitValue;
      subtotalBruto += valorBrutoItem;

      if (discountItem > 0) {
        const descontoItem = (valorBrutoItem * discountItem) / 100;
        descontoTotalItens += descontoItem;
      }
    });

    const subtotalAposDescontoItens = subtotalBruto - descontoTotalItens;
    const descontoGeral =
      dados.discount && dados.discount > 0
        ? (subtotalAposDescontoItens * dados.discount) / 100
        : 0;
    const valorTotal = subtotalAposDescontoItens - descontoGeral;

    const temDescontoItem = descontoTotalItens > 0;
    const temDescontoGeral = descontoGeral > 0;

    // A coluna de valor total é a última
    const colunaValorTotal = colunas[colunas.length - 1];
    // Largura das colunas de texto/rótulo (tudo menos a última)
    const larguraTexto = colunas
      .slice(0, colunas.length - 1)
      .reduce((acc, c) => acc + c.width, 0);

    const posXValor = margemEsq + larguraTexto; // Posição de início da coluna VALOR TOTAL

    // Linha SUBTOTAL BRUTO removida conforme solicitado.

    if (temDescontoItem) {
      // Garantir nova página se necessário
      if (currentY + alturaLinha > 700) {
        doc.addPage();
        currentY = 50;
      }

      doc.rect(margemEsq, currentY, larguraTotal, alturaLinha).stroke();
      doc
        .moveTo(posXValor, currentY)
        .lineTo(posXValor, currentY + alturaLinha)
        .stroke();

      doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000");
      doc.text("DESCONTO NOS ITENS", margemEsq + 5, currentY + 8, {
        width: larguraTexto - 10,
        align: "right",
      });
      doc.text(
        `- ${this.formatarMoeda(descontoTotalItens)}`,
        posXValor + 3,
        currentY + 8,
        { width: colunaValorTotal.width - 6, align: "right" }
      );
      currentY += alturaLinha;
    }

    if (temDescontoGeral) {
      // Garantir nova página se necessário
      if (currentY + alturaLinha > 700) {
        doc.addPage();
        currentY = 50;
      }

      doc.rect(margemEsq, currentY, larguraTotal, alturaLinha).stroke();
      doc
        .moveTo(posXValor, currentY)
        .lineTo(posXValor, currentY + alturaLinha)
        .stroke();

      // MUDANÇA: Renomeado de "DESCONTO GERAL" para "DESCONTO"
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000");
      doc.text("DESCONTO", margemEsq + 5, currentY + 8, {
        width: larguraTexto - 10,
        align: "right",
      });
      doc.text(
        `- ${this.formatarMoeda(descontoGeral)}`,
        posXValor + 3,
        currentY + 8,
        { width: colunaValorTotal.width - 6, align: "right" }
      );
      currentY += alturaLinha;
    }

    // VALOR TOTAL (sempre aparece)
    // Garantir nova página se necessário
    if (currentY + alturaLinha > 700) {
      doc.addPage();
      currentY = 50;
    }

    doc.rect(margemEsq, currentY, larguraTotal, alturaLinha).stroke();
    doc
      .moveTo(posXValor, currentY)
      .lineTo(posXValor, currentY + alturaLinha)
      .stroke();

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000"); // Aumenta a fonte para o total
    doc.text("VALOR TOTAL", margemEsq + 5, currentY + 8, {
      width: larguraTexto - 10,
      align: "right",
    });
    doc.text(this.formatarMoeda(valorTotal), posXValor + 3, currentY + 8, {
      width: colunaValorTotal.width - 6,
      align: "right",
    });

    doc.y = currentY + alturaLinha + 20;
  }

  private adicionarDadosCliente(
    doc: PDFKit.PDFDocument,
    dados: OrderServiceData
  ) {
    // MUDANÇA: Os dados do cliente são adicionados no `doc.y` atual, ou seja, logo após a tabela.

    // Título para a seção de dados do cliente
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Informações do Cliente", 50)
      .moveDown(0.5);

    // Detalhes do cliente
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#000000")
      .text(`Cliente: ${dados.clientName}`, 50)
      .moveDown(0.5)
      .text(`Prazo de entrega: ${this.formatarData(dados.deliveryDeadline)}`)
      .moveDown(0.5)
      .text(`Forma de Pagamento: ${dados.paymentMethod || "-"}`)
      .moveDown(2);
  }

  private adicionarAssinaturas(doc: PDFKit.PDFDocument) {
    // Se o conteúdo atual estiver muito embaixo, cria nova página
    if (doc.y > 600) {
      doc.addPage();
    }

    const posYAssinatura = 750; // Mais próximo do final da página
    const dataAtual = new Date().toLocaleDateString("pt-BR");

    // Data alinhada à direita na mesma linha - CORRIGIDO
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#000000")
      .text(`João Pessoa, ${dataAtual}`, 50, posYAssinatura - 80, {
        align: "right",
        width: 495, // Usa a largura total da área útil
      });

    // Linhas de assinatura com mais espaçamento acima
    const linhaInicio1 = 100;
    const linhaFim1 = 250;
    const linhaInicio2 = 350;
    const linhaFim2 = 500;

    doc
      .moveTo(linhaInicio1, posYAssinatura)
      .lineTo(linhaFim1, posYAssinatura)
      .stroke();
    doc
      .moveTo(linhaInicio2, posYAssinatura)
      .lineTo(linhaFim2, posYAssinatura)
      .stroke();

    // Nomes centralizados
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#000000")
      .text("Artestofados", linhaInicio1, posYAssinatura + 8, {
        width: linhaFim1 - linhaInicio1,
        align: "center",
      })
      .text("Cliente", linhaInicio2, posYAssinatura + 8, {
        width: linhaFim2 - linhaInicio2,
        align: "center",
      });
  }

  private adicionarImagensUsuario(
    doc: PDFKit.PDFDocument,
    imagens: Array<{ buffer: Buffer; originalname: string; mimetype: string }>
  ) {
    console.log(
      "🖼️ adicionarImagensUsuario chamado com:",
      imagens?.length || 0,
      "imagens"
    );

    if (!imagens || imagens.length === 0) {
      console.log("⚠️ Nenhuma imagem para adicionar");
      return;
    }

    doc.addPage();
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Anexos do Cliente", { align: "center" });
    doc.moveDown(2);

    let posY = 100;
    for (const imageData of imagens) {
      try {
        console.log(
          "📸 Processando imagem:",
          imageData.originalname,
          "Buffer size:",
          imageData.buffer.length
        );

        if (posY > 650) {
          doc.addPage();
          posY = 100;
        }

        // Tamanho fixo para teste - sem calcular dimensões por enquanto
        const maxWidth = 400;
        const maxHeight = 400;
        const width = maxWidth;
        const height = maxHeight;

        // Centraliza horizontalmente
        const startX = 50 + (495 - width) / 2;

        console.log("📐 Usando dimensões fixas:", {
          width,
          height,
          startX,
          posY,
        });

        // Incorpora a imagem diretamente no PDF usando o buffer
        doc.image(imageData.buffer, startX, posY, {
          fit: [width, height], // Usa fit em vez de width/height específicos
          align: "center",
          valign: "center",
        });
        posY += height + 20; // Adiciona a altura da imagem mais uma margem

        console.log(`✅ Imagem incorporada no PDF: ${imageData.originalname}`);
      } catch (err) {
        console.error("❌ Erro ao incorporar imagem:", err);
        console.error(
          "Detalhes do erro:",
          err instanceof Error ? err.message : String(err)
        );
        console.error("Buffer info:", {
          length: imageData.buffer.length,
          type: typeof imageData.buffer,
          constructor: imageData.buffer.constructor.name,
        });
      }
    }
  }

  async generateOSPDF(
    osData: OrderServiceData
  ): Promise<{ filename: string; filepath: string; size: number }> {
    return new Promise((resolve, reject) => {
      try {
        console.log("📄 Iniciando geração de PDF com PDFKit...");

        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const filename = `os_${osData.id || "new"}_${Date.now()}.pdf`;
        const filepath = path.join(this.uploadsDir, "pdfs", filename);

        // Garantir que o diretório pdfs exista
        const pdfsDir = path.dirname(filepath);
        if (!fs.existsSync(pdfsDir)) {
          fs.mkdirSync(pdfsDir, { recursive: true });
        }

        const stream = fs.createWriteStream(filepath);

        stream.on("error", (error) => {
          console.error("❌ Erro na stream:", error);
          reject(error);
        });

        doc.on("error", (error) => {
          console.error("❌ Erro no documento:", error);
          reject(error);
        });

        doc.pipe(stream);

        // Gerar PDF
        this.adicionarCabecalho(doc);

        // MUDANÇA: A chamada a adicionarDadosCliente foi movida para depois de adicionarTabelaItens
        this.adicionarTabelaItens(doc, osData); // Tabela de itens primeiro
        this.adicionarDadosCliente(doc, osData); // Dados do cliente após a tabela

        this.adicionarAssinaturas(doc);

        // Adicionar imagens se houver
        console.log("🔍 Verificando imagens para adicionar ao PDF:");
        console.log("- osData.images existe?", !!osData.images);
        console.log("- osData.images.length?", osData.images?.length);
        console.log("- osData.images:", osData.images);

        if (osData.images && osData.images.length > 0) {
          console.log("📸 Chamando adicionarImagensUsuario...");
          this.adicionarImagensUsuario(doc, osData.images);
        } else {
          console.log("⚠️ Nenhuma imagem para adicionar ao PDF");
        }

        doc.end();

        stream.on("finish", async () => {
          try {
            const stats = fs.statSync(filepath);
            console.log(
              "✅ PDF criado com sucesso. Tamanho:",
              stats.size,
              "bytes"
            );

            resolve({
              filename,
              filepath,
              size: stats.size,
            });
          } catch (error) {
            console.error("❌ Erro ao finalizar PDF:", error);
            reject(error);
          }
        });
      } catch (error) {
        console.error("❌ Erro ao criar documento:", error);
        reject(error);
      }
    });
  }
}

export async function generateOrderServicePDF(
  data: OrderServiceData
): Promise<string> {
  const service = new PDFService();
  const result = await service.generateOSPDF(data);
  return result.filepath;
}
