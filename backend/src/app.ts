import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import appointmentRoutes from "./routes/appointments";
import chatbotRoutes from "./routes/chatbot";
import osRoutes from "./routes/os";
import userRoutes from "./routes/users";
import whatsappRoutes from "./routes/whatsapp";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
// #region agent log
fetch('http://127.0.0.1:7242/ingest/0706edf3-73bf-4965-a41a-e0e48bfe722c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.ts:14',message:'PrismaClient creation',data:{databaseUrl:process.env.DATABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion
const prisma = new PrismaClient();
// #region agent log
prisma.$connect().then(()=>{fetch('http://127.0.0.1:7242/ingest/0706edf3-73bf-4965-a41a-e0e48bfe722c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.ts:16',message:'PrismaClient connected',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});}).catch((err)=>{fetch('http://127.0.0.1:7242/ingest/0706edf3-73bf-4965-a41a-e0e48bfe722c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.ts:16',message:'PrismaClient connection error',data:{error:err.message,errorCode:err.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});});
// #endregion

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0706edf3-73bf-4965-a41a-e0e48bfe722c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.ts:27',message:'Health check query attempt',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0706edf3-73bf-4965-a41a-e0e48bfe722c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.ts:29',message:'Health check query success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0706edf3-73bf-4965-a41a-e0e48bfe722c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.ts:36',message:'Health check query error',data:{error:error?.message,errorCode:error?.code,errorMeta:error?.meta},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/os", osRoutes);
app.use("/api/users", userRoutes);
app.use("/api/whatsapp", whatsappRoutes);

app.use(errorHandler);

export { app, prisma };
