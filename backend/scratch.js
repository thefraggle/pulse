const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const finalOptions = ['Gesamtbewertung'];
  const room = await prisma.room.create({
    data: {
      code: 'TEST12',
      type: 'RATING',
      options: {
        create: finalOptions.map(opt => ({ text: opt }))
      }
    },
    include: { options: true }
  });
  console.log(JSON.stringify(room, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
