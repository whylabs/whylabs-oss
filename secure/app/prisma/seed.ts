import crypto from 'crypto';

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  log: ['query', 'info', 'warn'],
});
const main = async () => {
  console.log('Seeding database...');
  const secretRecord = await prisma.jWTSecret.findFirst();
  if (secretRecord) {
    console.log('JWT secret already exists. Skipping...');
  } else {
    const newSecret = crypto.randomBytes(64).toString('hex');
    await prisma.jWTSecret.create({
      data: { secret: newSecret },
    });
    console.log('JWT secret created');
  }

  console.log('Database seeded!');
};
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    // eslint-disable-next-line
    process.exit(1);
  });
