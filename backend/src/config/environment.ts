import dotenv from "dotenv";
import { z } from "zod";

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Esquema de validação das variáveis de ambiente
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("4041"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  WHATSAPP_SESSION_PATH: z.string().default("./whatsapp-sessions"),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_CREDENTIALS: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().default("primary"),
  FRONTEND_URL: z.string().default("http://72.61.218.112:4040"),
  // Adicione outras variáveis de ambiente conforme necessário
});

type EnvVariables = z.infer<typeof envSchema>;

declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvVariables {}
  }
}

export function validateConfig() {
  try {
    // Valida as variáveis de ambiente
    const envVars = envSchema.parse(process.env);

    // Extrair nome do banco da DATABASE_URL
    const dbNameMatch = envVars.DATABASE_URL.match(/\/([^/?]+)(\?|$)/);
    const dbName = dbNameMatch ? dbNameMatch[1] : "unknown";

    // Retorna as variáveis de ambiente validadas
    return {
      nodeEnv: envVars.NODE_ENV,
      port: parseInt(envVars.PORT, 10) || 4041,
      database: {
        url: envVars.DATABASE_URL,
      },
      jwt: {
        secret: envVars.JWT_SECRET,
        expiresIn: envVars.JWT_EXPIRES_IN,
      },
      whatsapp: {
        sessionPath: envVars.WHATSAPP_SESSION_PATH,
      },
      openai: {
        apiKey: envVars.OPENAI_API_KEY,
      },
      google: {
        credentials: envVars.GOOGLE_API_CREDENTIALS
          ? JSON.parse(envVars.GOOGLE_API_CREDENTIALS)
          : null,
        calendarId: envVars.GOOGLE_CALENDAR_ID,
      },
      frontendUrl: envVars.FRONTEND_URL,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid environment variables:", error.errors);
    } else {
      console.error("❌ Failed to validate environment variables:", error);
    }
    process.exit(1);
  }
}

export const config = validateConfig();

export default config;
