import { Router, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import multer from "multer";
import { generateOrderServicePDF } from "../services/pdfGenerator";

interface OrderItem {
  name: string;
  quantity: number;
  unitValue: number;
  total: number;
}

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads - usando memória para incorporação direta
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept all image files
    if (file.mimetype.startsWith("image/")) {
      console.log("Image file accepted:", {
        originalname: file.originalname,
        mimetype: file.mimetype,
      });
      cb(null, true);
    } else {
      console.log("File rejected - not an image:", {
        originalname: file.originalname,
        mimetype: file.mimetype,
      });
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, delayFilter } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Construir condições de busca
    const searchConditions = search
      ? {
          OR: [
            {
              clientName: {
                contains: search as string,
                mode: "insensitive" as const,
              },
            },
            {
              clientPhone: {
                contains: search as string,
                mode: "insensitive" as const,
              },
            },
            {
              clientEmail: {
                contains: search as string,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {};

    // Construir condições de filtro de atraso
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let delayConditions: any = {};

    if (delayFilter) {
      switch (delayFilter) {
        case "no-delay":
          // Sem atraso: deliveryDeadline >= hoje ou null
          delayConditions = {
            OR: [
              { deliveryDeadline: null },
              { deliveryDeadline: { gte: today } },
            ],
          };
          break;
        case "delayed":
          // Atrasadas: deliveryDeadline < hoje e não null
          delayConditions = {
            deliveryDeadline: {
              lt: today,
              not: null,
            },
          };
          break;
        case "7":
        case "30":
        case "60":
          // Atrasadas mais de X dias
          const days = parseInt(delayFilter as string);
          const cutoffDate = new Date(today);
          cutoffDate.setDate(cutoffDate.getDate() - days);
          delayConditions = {
            deliveryDeadline: {
              lt: cutoffDate,
              not: null,
            },
          };
          break;
        default:
          // "all" ou qualquer outro valor: sem filtro de atraso
          delayConditions = {};
      }
    }

    // Combinar condições
    // Se ambas as condições existem, precisamos combiná-las com AND
    const where: any = {};
    
    if (Object.keys(searchConditions).length > 0 && Object.keys(delayConditions).length > 0) {
      where.AND = [
        searchConditions,
        delayConditions,
      ];
    } else if (Object.keys(searchConditions).length > 0) {
      Object.assign(where, searchConditions);
    } else if (Object.keys(delayConditions).length > 0) {
      Object.assign(where, delayConditions);
    }

    const [os, total] = await Promise.all([
      prisma.orderService.findMany({
        where,
        include: {
          items: true,
          createdByUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.orderService.count({ where }),
    ]);

    // Adicionar previews de imagens para cada OS
    const osWithPreviews = await Promise.all(
      os.map(async (order) => {
        const osWithImages = await prisma.orderService.findUnique({
          where: { id: order.id },
          select: { images: true },
        });

        const imagesForPreview =
          (osWithImages as any)?.images?.map((img: any) => ({
            originalname: img.originalname,
            mimetype: img.mimetype,
            preview: `data:${img.mimetype};base64,${img.base64}`, // Data URL para preview
            base64: img.base64, // Mantém para regeneração de PDF
          })) || [];

        return {
          ...order,
          images: imagesForPreview,
        };
      })
    );

    res.json({
      data: osWithPreviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Rota para obter estatísticas (deve vir antes de /:id para não ser capturada)
router.get("/stats/count", authenticateToken, async (req, res, next) => {
  try {
    const total = await prisma.orderService.count();
    res.json({ total });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const os = await prisma.orderService.findUnique({
      where: { id },
      include: {
        items: true,
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        lastEditedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!os) {
      throw createError("Order service not found", 404);
    }

    // Recuperar imagens do banco e converter para formato de preview
    const osWithImages = await prisma.orderService.findUnique({
      where: { id },
      select: { images: true },
    });

    // Converter imagens do formato do banco para o formato de preview
    const imagesForPreview =
      (osWithImages as any)?.images?.map((img: any) => ({
        originalname: img.originalname,
        mimetype: img.mimetype,
        preview: `data:${img.mimetype};base64,${img.base64}`, // Data URL para preview
        base64: img.base64, // Mantém para regeneração de PDF
      })) || [];

    // Adicionar imagens formatadas à resposta
    const response = {
      ...os,
      images: imagesForPreview,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  authenticateToken,
  upload.array("images", 20),
  async (req, res, next) => {
    try {
      const {
        clientName,
        clientPhone,
        clientEmail,
        clientAddress,
        deliveryDeadline,
        paymentMethod,
        items,
        discount = 0,
        generatePDF = false,
      } = req.body;

      const uploadedImages = req.files || [];

      console.log("📄 Dados recebidos:", {
        clientName,
        clientPhone,
        deliveryDeadline,
        paymentMethod,
        items: typeof items === "string" ? "String" : "Array",
        discount,
        imagesCount: uploadedImages.length,
        hasFiles: !!req.files,
        filesLength: req.files?.length,
      });

      // Validation
      const missingFields = [];
      if (!clientName) missingFields.push("clientName");
      // clientPhone e clientAddress são opcionais
      if (!deliveryDeadline) missingFields.push("deliveryDeadline");
      if (!paymentMethod) missingFields.push("paymentMethod");
      if (!items) missingFields.push("items");

      if (missingFields.length > 0) {
        console.error("❌ Campos faltando:", missingFields);
        return res.status(400).json({
          error: `Campos obrigatórios faltando: ${missingFields.join(", ")}`,
          missingFields,
        });
      }

      // Parse items if it's a string
      let itemsArray;
      try {
        itemsArray = typeof items === "string" ? JSON.parse(items) : items;
      } catch (parseError) {
        console.error("Erro ao fazer parse dos items:", parseError);
        return res.status(400).json({ error: "Items inválido" });
      }

      if (!itemsArray || itemsArray.length === 0) {
        return res.status(400).json({
          error: "É necessário informar ao menos um item",
        });
      }

      // Validate items structure
      for (const item of itemsArray) {
        if (!item.name || !item.quantity || !item.unitValue) {
          return res.status(400).json({
            error: "Cada item deve ter: name, quantity, unitValue",
          });
        }
        // Ensure total is calculated
        if (!item.total) {
          const qty = parseFloat(item.quantity);
          const unitVal = parseFloat(item.unitValue);
          const itemDiscount = parseFloat(item.discount || 0);
          const subtotal = qty * unitVal;
          item.total = (subtotal - (subtotal * itemDiscount) / 100).toFixed(2);
        }
      }

      console.log("✅ Itens validados:", itemsArray);

      // Prepare image data - agora como buffers para incorporação direta
      const imageData = Array.isArray(uploadedImages)
        ? uploadedImages.map((file: any) => ({
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
            base64: file.buffer.toString("base64"), // Salva como Base64 para regeneração
          }))
        : [];

      console.log("📷 Imagens processadas como buffers:", imageData.length);
      console.log(
        "📷 Dados das imagens:",
        imageData.map((img) => ({
          originalname: img.originalname,
          mimetype: img.mimetype,
          bufferSize: img.buffer.length,
          hasBase64: !!img.base64,
        }))
      );

      // Create OS in database
      const orderService = await prisma.orderService.create({
        data: {
          clientName,
          clientPhone,
          clientEmail,
          clientAddress,
          deliveryDeadline: deliveryDeadline
            ? new Date(deliveryDeadline)
            : null,
          paymentMethod,
          discount: discount ? parseFloat(discount) : 0,
          total: 0, // Will be calculated below
          createdBy: (req as any).user.id,
          lastEditedBy: (req as any).user.id,
          items: {
            create: itemsArray.map((item: any) => ({
              name: item.name,
              quantity: parseInt(item.quantity),
              unitValue: parseFloat(item.unitValue),
              total: parseFloat(item.total),
            })),
          },
          images: imageData.map((img) => ({
            originalname: img.originalname,
            base64: img.base64,
            mimetype: img.mimetype,
          })) as any, // Salva objetos completos para regeneração
        },
        include: {
          items: true,
        },
      });

      // Calculate subtotal (soma dos totais dos itens)
      const subtotal = itemsArray.reduce(
        (sum: number, item: any) => sum + parseFloat(item.total),
        0
      );

      // Apply general discount (percentage) to calculate final total
      const discountPercent = discount ? parseFloat(discount) : 0;
      const calculatedTotal = subtotal * (1 - discountPercent / 100);

      // Update with total
      const updatedOS = await prisma.orderService.update({
        where: { id: orderService.id },
        data: { total: Math.max(0, calculatedTotal) },
        include: {
          items: true,
        },
      });

      console.log("✅ OS criada no banco:", updatedOS.id);

      // Generate PDF with all data
      if (generatePDF === "true" || process.env.NODE_ENV === "development") {
        try {
          console.log("🔍 Dados para PDF - Imagens:", {
            imageDataLength: imageData.length,
            imageDataDetails: imageData.map((img) => ({
              originalname: img.originalname,
              mimetype: img.mimetype,
              bufferSize: img.buffer.length,
              hasBuffer: !!img.buffer,
              bufferType: typeof img.buffer,
            })),
          });

          console.log("📄 Gerando PDF com", imageData.length, "imagens...");

          const pdfPath = await generateOrderServicePDF({
            id: updatedOS.id,
            clientName: updatedOS.clientName,
            clientPhone: updatedOS.clientPhone || undefined,
            clientAddress: updatedOS.clientAddress || undefined,
            deliveryDeadline: updatedOS.deliveryDeadline
              ? updatedOS.deliveryDeadline.toISOString().split("T")[0]
              : undefined,
            paymentMethod: updatedOS.paymentMethod || undefined,
            items: updatedOS.items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unitValue: item.unitValue,
              total: item.total,
            })),
            images: imageData, // Passa os buffers diretamente para incorporação
            discount: updatedOS.discount,
            total: updatedOS.total,
            createdAt: updatedOS.createdAt,
          });

          console.log("✅ PDF gerado com imagens incorporadas:", pdfPath);

          // Update OS with PDF path
          await prisma.orderService.update({
            where: { id: updatedOS.id },
            data: { pdfPath },
          });

          updatedOS.pdfPath = pdfPath;
        } catch (pdfError) {
          console.error("Error generating PDF:", pdfError);
        }
      }

      // Converter imagens para formato de preview na resposta
      const imagesForPreview = imageData.map((img) => ({
        originalname: img.originalname,
        mimetype: img.mimetype,
        preview: `data:${img.mimetype};base64,${img.base64}`, // Data URL para preview
        base64: img.base64, // Mantém para regeneração de PDF
      }));

      res.status(201).json({
        success: true,
        message: "Order service created successfully",
        data: {
          ...updatedOS,
          images: imagesForPreview,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put("/:id", authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      clientName,
      clientPhone,
      clientEmail,
      clientAddress,
      deliveryDeadline,
      paymentMethod,
      items,
      discount,
      status,
      regeneratePDF = false,
    } = req.body;

    const userId = (req as any).user.id;

    const existingOS = await prisma.orderService.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOS) {
      throw createError("Order service not found", 404);
    }

    // Recuperar imagens do banco para regeneração
    const osWithImages = await prisma.orderService.findUnique({
      where: { id },
      select: { images: true },
    });

    let processedItems = items;
    let subtotal = 0;

    if (items) {
      const itemsArray = Array.isArray(items) ? items : JSON.parse(items);

      processedItems = itemsArray.map((item: OrderItem) => {
        // Calculate item total considering item discount if present
        const qty = parseFloat(item.quantity.toString());
        const unitVal = parseFloat(item.unitValue.toString());
        const itemDiscount = parseFloat((item as any).discount || 0);
        const itemSubtotal = qty * unitVal;
        const itemTotal = itemDiscount > 0 
          ? itemSubtotal * (1 - itemDiscount / 100)
          : itemSubtotal;
        
        return {
          ...item,
          total: itemTotal,
        };
      });

      await prisma.orderItem.deleteMany({
        where: { osId: id },
      });

      await prisma.orderItem.createMany({
        data: processedItems.map((item: OrderItem) => ({
          ...item,
          osId: id,
        })),
      });
    } else {
      // Se items não foi fornecido, usar os itens existentes
      processedItems = existingOS.items || [];
    }

    subtotal = processedItems.reduce(
      (sum: number, item: OrderItem) => sum + item.total,
      0
    );
    
    // Apply general discount (percentage) to calculate final total
    const discountPercent = discount !== undefined ? parseFloat(discount) : (existingOS.discount || 0);
    const total = Math.max(0, subtotal * (1 - discountPercent / 100));

    let pdfPath = existingOS.pdfPath;

    if (regeneratePDF || !pdfPath) {
      try {
        if (pdfPath) {
          await fsPromises.unlink(pdfPath).catch(() => {});
        }

        // Converter imagens Base64 do banco para buffers
        const storedImages = (osWithImages as any).images || [];
        const imageData = storedImages.map((img: any) => ({
          buffer: Buffer.from(img.base64, "base64"),
          originalname: img.originalname,
          mimetype: img.mimetype,
        }));

        pdfPath = await generateOrderServicePDF({
          id,
          clientName: clientName || existingOS.clientName,
          clientPhone: clientPhone || existingOS.clientPhone || undefined,
          clientAddress: clientAddress || existingOS.clientAddress || undefined,
          deliveryDeadline:
            deliveryDeadline || (existingOS as any).deliveryDeadline
              ? new Date(
                  deliveryDeadline || (existingOS as any).deliveryDeadline
                )
                  .toISOString()
                  .split("T")[0]
              : undefined,
          paymentMethod:
            paymentMethod || (existingOS as any).paymentMethod || undefined,
          items: processedItems.map((item: OrderItem) => ({
            name: item.name,
            quantity: item.quantity,
            unitValue: item.unitValue,
            total: item.total,
          })),
          images: imageData, // Usa as imagens do banco convertidas para buffers
          discount: discount || existingOS.discount,
          total,
          createdAt: existingOS.createdAt,
        });
      } catch (pdfError) {
        console.error("Error generating PDF:", pdfError);
      }
    }

    // Recuperar imagens do banco para incluir na resposta
    const osImagesForResponse = await prisma.orderService.findUnique({
      where: { id },
      select: { images: true },
    });

    // Converter imagens para formato de preview
    const imagesForPreview =
      (osImagesForResponse as any)?.images?.map((img: any) => ({
        originalname: img.originalname,
        mimetype: img.mimetype,
        preview: `data:${img.mimetype};base64,${img.base64}`, // Data URL para preview
        base64: img.base64, // Mantém para regeneração de PDF
      })) || [];

    const updatedOS = await prisma.orderService.update({
      where: { id },
      data: {
        clientName: clientName || existingOS.clientName,
        clientPhone: clientPhone || existingOS.clientPhone,
        clientAddress: clientAddress !== undefined ? clientAddress : existingOS.clientAddress,
        deliveryDeadline: deliveryDeadline
          ? new Date(deliveryDeadline)
          : (existingOS as any).deliveryDeadline,
        paymentMethod: paymentMethod || existingOS.paymentMethod,
        discount: discount !== undefined ? parseFloat(discount) : existingOS.discount,
        total,
        status: status || existingOS.status,
        pdfPath: pdfPath || existingOS.pdfPath,
        lastEditedBy: userId,
      } as any,
      include: {
        items: true,
        createdByUser: {
          select: {
            name: true,
            email: true,
          },
        },
        lastEditedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Adicionar imagens à resposta
    const response = {
      ...updatedOS,
      images: imagesForPreview,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:id/images/:imageName",
  authenticateToken,
  async (req, res, next) => {
    try {
      const { id, imageName } = req.params;

      // Recuperar OS com imagens
      const os = await prisma.orderService.findUnique({
        where: { id },
        select: { images: true },
      });

      if (!os) {
        throw createError("Order service not found", 404);
      }

      // Encontrar a imagem específica pelo nome
      const images = (os as any).images || [];
      const image = images.find((img: any) => img.originalname === imageName);

      if (!image) {
        throw createError("Image not found", 404);
      }

      // Converter Base64 para buffer e enviar
      const buffer = Buffer.from(image.base64, "base64");

      res.set({
        "Content-Type": image.mimetype,
        "Content-Length": buffer.length,
        "Cache-Control": "public, max-age=31536000", // Cache por 1 ano
      });

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
);

router.delete("/:id", authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const os = await prisma.orderService.findUnique({
      where: { id },
    });

    if (!os) {
      throw createError("Order service not found", 404);
    }

    if (os.pdfPath) {
      await fsPromises.unlink(os.pdfPath).catch(() => {});
    }

    await prisma.orderService.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/pdf", async (req, res, next) => {
  try {
    const { id } = req.params;

    const os = await prisma.orderService.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!os) {
      throw createError("Order service not found", 404);
    }

    // Recuperar imagens do banco
    const osWithImages = await prisma.orderService.findUnique({
      where: { id },
      select: { images: true },
    });

    let pdfBuffer;

    if (os.pdfPath) {
      try {
        pdfBuffer = await fsPromises.readFile(os.pdfPath);
      } catch (fileError) {
        // File doesn't exist, regenerate it
        console.log("PDF file missing, regenerating...", {
          pdfPath: os.pdfPath,
          error: fileError,
          osId: os.id,
          hasItems: !!os.items,
          itemsCount: os.items?.length,
        });

        try {
          // Converter imagens Base64 do banco para buffers
          const storedImages = (osWithImages as any).images || [];
          const imageData = storedImages.map((img: any) => ({
            buffer: Buffer.from(img.base64, "base64"),
            originalname: img.originalname,
            mimetype: img.mimetype,
          }));

          const newPdfPath = await generateOrderServicePDF({
            id: os.id,
            clientName: os.clientName,
            clientPhone: os.clientPhone || undefined,
            clientAddress: os.clientAddress || undefined,
            deliveryDeadline: (os as any).deliveryDeadline
              ? new Date((os as any).deliveryDeadline)
                  .toISOString()
                  .split("T")[0]
              : undefined,
            paymentMethod: (os as any).paymentMethod || undefined,
            items: os.items.map((item: any) => ({
              name: item.name,
              quantity: item.quantity,
              unitValue: item.unitValue,
              total: item.total,
            })),
            images: imageData, // Usa as imagens do banco convertidas para buffers
            discount: os.discount,
            total: os.total,
            createdAt: os.createdAt,
          });

          console.log("PDF regenerated successfully:", newPdfPath);

          await prisma.orderService.update({
            where: { id },
            data: { pdfPath: newPdfPath },
          });

          pdfBuffer = await fsPromises.readFile(newPdfPath);
        } catch (pdfGenError) {
          console.error("Failed to regenerate PDF:", pdfGenError);
          throw createError("Failed to generate PDF", 500);
        }
      }
    } else {
      throw createError("PDF not generated", 404);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="os-${id}.pdf"`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
