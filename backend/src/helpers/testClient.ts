import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

export async function createTestClient() {
  const hashedPassword = await bcrypt.hash("test123", 10);

  const user = await prisma.user.create({
    data: {
      email: "test@example.com",
      name: "Test User",
      password: hashedPassword,
      role: "ATTENDANT",
    },
  });

  return user;
}

export async function cleanupTestClient(userId: string) {
  await prisma.appointment.deleteMany({
    where: { createdBy: userId },
  });

  await prisma.user.delete({
    where: { id: userId },
  });
}
