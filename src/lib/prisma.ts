import { PrismaClient } from "@/generated/prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Initialize PrismaClient
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma = global.prisma || new (PrismaClient as any)();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
