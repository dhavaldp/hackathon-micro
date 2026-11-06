import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & { carpoolPrisma?: PrismaClient };

export const prisma = globalForPrisma.carpoolPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.carpoolPrisma = prisma;
