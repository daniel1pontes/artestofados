import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@estofados.com" },
    update: {},
    create: {
      email: "admin@estofados.com",
      name: "Administrador",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  const attendant = await prisma.user.upsert({
    where: { email: "atendente@estofados.com" },
    update: {},
    create: {
      email: "atendente@estofados.com",
      name: "Atendente",
      password: await bcrypt.hash("atendente123", 10),
      role: "ATTENDANT",
    },
  });

  console.log("✅ Users created:", {
    admin: admin.email,
    attendant: attendant.email,
  });

  const whatsappConn = await prisma.whatsappConn.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      status: "DISCONNECTED",
    },
  });

  console.log("✅ WhatsApp connection initialized");

  console.log("🎉 Database seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
