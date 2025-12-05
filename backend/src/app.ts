import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import chatbotRoutes from "./routes/chatbot";
import osRoutes from "./routes/os";
import userRoutes from "./routes/users";
import whatsappRoutes from "./routes/whatsapp";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/os", osRoutes);
app.use("/api/users", userRoutes);
app.use("/api/whatsapp", whatsappRoutes);

app.use(errorHandler);

export { app, prisma };
