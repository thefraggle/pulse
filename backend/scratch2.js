const express = require('express');
const app = express();
app.use(express.json());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

app.post('/api/admin/rooms', async (req, res) => {
  const { type, options, question, wordLimit } = req.body; 
  try {
    let finalOptions = options || [];
    if (type === 'RATING' && finalOptions.length === 0) {
      finalOptions = ['Gesamtbewertung'];
    }
    const code = "T" + Date.now();
    const room = await prisma.room.create({
      data: {
        code,
        type,
        options: (type === 'POLL' || type === 'RANKING' || type === 'RATING') ? {
          create: finalOptions.map(opt => ({ text: opt }))
        } : undefined
      },
      include: { options: true }
    });
    res.json(room);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

const server = app.listen(3333, async () => {
  const res = await fetch('http://localhost:3333/api/admin/rooms', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ type: 'RATING', options: [] })
  });
  const data = await res.json();
  console.log("RESULT", JSON.stringify(data, null, 2));
  server.close();
  prisma.$disconnect();
});
