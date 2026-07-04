import { PrismaClient } from "@prisma/client";
import { config } from "./config.js";

/** Cliente Prisma único (singleton) reaproveitado em dev com hot-reload. */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isProd ? ["warn", "error"] : ["warn", "error"],
  });

if (!config.isProd) globalForPrisma.prisma = prisma;
