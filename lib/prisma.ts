import { PrismaClient } from '@prisma/client';
import { serverEnv } from './env';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: serverEnv.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    // Connection pool configuration for production
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Store globally in ALL environments to prevent connection pool exhaustion
// from multiple PrismaClient instances created during serverless cold starts
// or Next.js hot module replacement in development
global.prisma = prisma;

// Graceful shutdown: disconnect on process termination
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}
