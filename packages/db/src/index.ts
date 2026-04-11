// packages/db/src/index.ts
// PrismaClient singleton — prevents exhausting database connections during Next.js hot reload.
// Pattern: store instance on globalThis in development; create fresh instance in production.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env["NODE_ENV"] === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = db;
}
