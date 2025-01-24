import { PrismaClient } from '../../generated/client';

export const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  log: process.env.NODE_ENV === 'local' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});
