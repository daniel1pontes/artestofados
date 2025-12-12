import { app } from "./app";
import dotenv from "dotenv";
import { validateConfig } from "./config/environment";

dotenv.config();

// #region agent log
fetch('http://127.0.0.1:7242/ingest/0706edf3-73bf-4965-a41a-e0e48bfe722c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:5',message:'server.ts module loading',data:{pid:process.pid,nodeVersion:process.version},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
// #endregion

// Validar configurações
validateConfig();

// #region agent log
fetch('http://127.0.0.1:7242/ingest/0706edf3-73bf-4965-a41a-e0e48bfe722c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:10',message:'validateConfig completed',data:{pid:process.pid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
// #endregion

const PORT = process.env.PORT || 4041;

// #region agent log
fetch('http://127.0.0.1:7242/ingest/0706edf3-73bf-4965-a41a-e0e48bfe722c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:20',message:'PORT determined',data:{port:PORT,envPort:process.env.PORT,pid:process.pid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H3'})}).catch(()=>{});
// #endregion

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down gracefully...");
  // Add any cleanup logic here
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  shutdown();
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  shutdown();
});

// Start the server
// #region agent log
fetch('http://127.0.0.1:7242/ingest/0706edf3-73bf-4965-a41a-e0e48bfe722c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:47',message:'app.listen called',data:{port:PORT,pid:process.pid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2,H4,H5'})}).catch(()=>{});
// #endregion

const server = app.listen(PORT, () => {
// #region agent log
fetch('http://127.0.0.1:7242/ingest/0706edf3-73bf-4965-a41a-e0e48bfe722c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:52',message:'Server started successfully',data:{port:PORT,pid:process.pid,address:server.address()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H2'})}).catch(()=>{});
// #endregion
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🤖 AI Chatbot ready!`);
});

// #region agent log
server.on('error', (err: any) => {
  fetch('http://127.0.0.1:7242/ingest/0706edf3-73bf-4965-a41a-e0e48bfe722c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:61',message:'Server listen error',data:{port:PORT,pid:process.pid,errorCode:err.code,errorMessage:err.message,errno:err.errno,syscall:err.syscall,address:err.address},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H3,H4'})}).catch(()=>{});
});
// #endregion
