import { app } from "./app";
import dotenv from "dotenv";
import { validateConfig } from "./config/environment";

dotenv.config();

// Validar configurações
validateConfig();

const PORT = process.env.PORT || 4041;

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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🤖 AI Chatbot ready!`);
});
