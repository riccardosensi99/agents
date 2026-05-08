import { PrismaClient } from "@prisma/client";

export const prisma: PrismaClient = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
});
