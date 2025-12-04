// Tipos temporários para o Prisma Client
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// Adicione aqui quaisquer tipos personalizados do Prisma que você esteja usando
type AppointmentType = "ONLINE" | "IN_STORE";

// Adicione outras definições de tipo conforme necessário

// Exporte os tipos que precisam ser usados em outros arquivos
export type { AppointmentType };

// Adicione uma declaração para o objeto prisma
export const prisma: PrismaClient;

// Se você estiver usando namespaces, você pode adicionar algo como:
declare namespace Prisma {
  // Adicione aqui quaisquer extensões ou tipos personalizados do Prisma
}

// Se você estiver usando o Prisma Client Extensions
declare module "@prisma/client" {
  // Adicione aqui suas extensões de cliente, se necessário
}
