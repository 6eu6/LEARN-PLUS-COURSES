import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure Prisma with connection pooling for better performance
// This reduces the number of database connections and improves query efficiency
const prismaOptions = {
  // Connection pooling settings
  pool: {
    max_connections: 10,      // Maximum number of connections in the pool
    min_connections: 2,       // Minimum number of connections to keep open
    idle_timeout: 30000,     // 30 seconds - close idle connections after this time
    max_lifetime: 60000,     // 60 seconds - maximum lifetime of a connection
  },
  // Log queries in development for debugging
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
}

export const db =
  globalForPrisma.prisma ?? new PrismaClient(prismaOptions)

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
