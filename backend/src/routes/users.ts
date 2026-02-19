import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";

const router = Router();

router.get("/", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = search
      ? {
          OR: [
            {
              name: {
                contains: search as string,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: search as string,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
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

router.get("/:id", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw createError("User not found", 404);
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { email, name, password, role = "ATTENDANT" } = req.body;

    if (!email || !name || !password) {
      throw createError("Email, name and password are required", 400);
    }

    if (!["ADMIN", "ATTENDANT"].includes(role)) {
      throw createError("Invalid role", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw createError("User already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, name, password, role } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw createError("User not found", 404);
    }

    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        throw createError("Email already in use", 409);
      }
    }

    const updateData: any = {
      email,
      name,
      role,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const currentUserId = (req as any).user.id;

      if (id === currentUserId) {
        throw createError("Cannot delete your own account", 400);
      }

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw createError("User not found", 404);
      }

      await prisma.user.delete({
        where: { id },
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
