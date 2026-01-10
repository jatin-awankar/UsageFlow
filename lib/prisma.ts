import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// 1. Initialize the database driver
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

// 2. Wrap it in the Prisma adapter
const adapter = new PrismaPg(pool)

// 3. Pass the adapter to the constructor
export const prisma =
  globalForPrisma.prisma || new PrismaClient({ adapter,log: ["query", "error"]})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
