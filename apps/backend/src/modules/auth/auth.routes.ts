import bcrypt from "bcryptjs";
import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { authenticate, signToken } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { loginSchema, registerSchema } from "./auth.schemas";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({
      where: { email: req.body.email }
    });

    if (existing) {
      throw new AppError(409, "Email already registered");
    }

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: req.body.email,
        name: req.body.name,
        passwordHash
      }
    });

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  })
);

authRoutes.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { email: req.body.email }
    });

    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }

    const passwordOk = await bcrypt.compare(req.body.password, user.passwordHash);

    if (!passwordOk) {
      throw new AppError(401, "Invalid credentials");
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  })
);

authRoutes.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id }
    });

    if (!user) {
      throw new AppError(401, "Invalid user");
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  })
);
