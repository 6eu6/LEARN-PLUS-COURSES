import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma Client options. The `pool` option previously passed here is NOT a
// valid Prisma Client constructor option — it was silently ignored, and
// connection pooling is managed by Prisma Accelerate on the server side.
const logLevel = process.env.NODE_ENV === 'development'
  ? ['query', 'info', 'warn', 'error']
  : ['error']

export const db =
  globalForPrisma.prisma ?? new PrismaClient({ log: logLevel as any })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Graceful shutdown: close database connections
process.on('SIGTERM', async () => {
  await db.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await db.$disconnect();
  process.exit(0);
});
