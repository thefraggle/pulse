const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generatePassphrase } = require('./utils/passphrase');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'; // Change in production via .env
const JWT_SECRET = process.env.JWT_SECRET || 'pulse-super-secret-key-123'; // Change in production via .env

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Helper: Generate 6-char code (without ambiguous chars: O, 0, I, 1, L)
const generateCode = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return result;
};

// Helper: Sanitize input (React handles XSS automatically, so we just trim. Encoding HTML entities causes double-escaping in React)
const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return filterProfanity(str.trim());
};

// Helper: Profanity Filter
const loadBadWords = () => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'badwords.json'), 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.warn('Could not load badwords.json, profanity filter disabled.');
    return [];
  }
};
const BAD_WORDS = loadBadWords();

const filterProfanity = (text) => {
  if (!text || BAD_WORDS.length === 0) return text;
  let filtered = text;
  BAD_WORDS.forEach(word => {
    // Case-insensitive replace whole words
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '***');
  });
  return filtered;
};

// --- REST API ---

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ username: 'admin', role: 'SUPERADMIN' }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ success: true, token, role: 'SUPERADMIN', username: 'admin' });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (user && await bcrypt.compare(password, user.passwordHash)) {
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ success: true, token, role: user.role, username: user.username });
  }

  res.status(401).json({ error: 'Unauthorized' });
});

app.post('/api/admin/rooms', authenticateToken, async (req, res) => {
  const { type, options, question, wordLimit, userId } = req.body; 
  try {
    let finalOptions = options || [];
    if (type === 'RATING' && finalOptions.length === 0) {
      finalOptions = ['Overall Rating'];
    }

    let code = generateCode();
    while (await prisma.room.findUnique({ where: { code } })) {
      code = generateCode();
    }

    const room = await prisma.room.create({
      data: {
        code,
        type,
        userId: req.user.role === 'SUPERADMIN' ? (userId || null) : req.user.id,
        question: question ? sanitizeInput(question) : null,
        wordLimit: wordLimit ? parseInt(wordLimit, 10) : 4,
        options: (type === 'POLL' || type === 'RANKING' || type === 'RATING') ? {
          create: finalOptions.map(opt => ({ text: sanitizeInput(opt) }))
        } : undefined
      },
      include: { options: true, words: true, qnaMessages: true, openAnswers: true }
    });
    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/rooms', authenticateToken, async (req, res) => {
  const where = req.user.role === 'SUPERADMIN' ? {} : { userId: req.user.id };
  const rooms = await prisma.room.findMany({
    where,
    include: { 
      options: true, 
      words: true, 
      qnaMessages: { orderBy: { upvotes: 'desc' } }, 
      openAnswers: { orderBy: { createdAt: 'desc' } },
      user: true
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(rooms);
});

app.delete('/api/admin/rooms/:id', authenticateToken, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!room) return res.status(404).json({ error: 'Not found' });
    
    if (req.user.role !== 'SUPERADMIN' && room.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    io.to(room.code).emit('roomDeleted');
    await prisma.room.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User Management (Admin only)
app.get('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' });
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true, _count: { select: { rooms: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(users);
});

app.post('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' });
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  try {
    const password = generatePassphrase();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, passwordHash },
      select: { id: true, username: true, role: true, createdAt: true }
    });
    res.json({ ...user, clearTextPassword: password });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Username taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/password', authenticateToken, async (req, res) => {
  if (req.user.role === 'SUPERADMIN') return res.status(400).json({ error: 'Superadmin password must be managed via .env' });
  
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !(await bcrypt.compare(oldPassword, user.passwordHash))) {
      return res.status(401).json({ error: 'Incorrect old password' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ error: 'Forbidden' });
  try {
    const rooms = await prisma.room.findMany({ where: { userId: req.params.id } });
    for (const r of rooms) {
      io.to(r.code).emit('roomDeleted');
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/rooms/:code', async (req, res) => {
  const room = await prisma.room.findUnique({
    where: { code: req.params.code.toUpperCase() },
    include: { 
      options: true, 
      words: true, 
      qnaMessages: { orderBy: { upvotes: 'desc' } }, 
      openAnswers: { orderBy: { createdAt: 'desc' } } 
    }
  });
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

// Timer Check Helper
const checkTimer = (room) => {
  if (room.timerEndsAt && new Date() > new Date(room.timerEndsAt)) {
    return true; // Timer is expired
  }
  return false;
};

// --- SOCKET.IO ---

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinRoom', async (code) => {
    socket.join(code);
    console.log(`Socket ${socket.id} joined room ${code}`);
  });

  const getFullRoom = async (code) => {
    return await prisma.room.findUnique({
      where: { code },
      include: { 
        options: true, 
        words: true, 
        qnaMessages: { orderBy: { upvotes: 'desc' } }, 
        openAnswers: { orderBy: { createdAt: 'desc' } } 
      }
    });
  };

  socket.on('toggleRoomLock', async ({ code }) => {
    try {
      const current = await prisma.room.findUnique({ where: { code } });
      if (!current) return;
      await prisma.room.update({
        where: { code },
        data: { isLocked: !current.isLocked }
      });
      const room = await getFullRoom(code);
      if (room) io.to(code).emit('roomUpdated', room);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('toggleRoomVisibility', async ({ code }) => {
    try {
      const current = await prisma.room.findUnique({ where: { code } });
      if (!current) return;
      await prisma.room.update({
        where: { code },
        data: { isHidden: !current.isHidden }
      });
      const room = await getFullRoom(code);
      if (room) io.to(code).emit('roomUpdated', room);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('startTimer', async ({ code, minutes }) => {
    try {
      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return;
      const endsAt = new Date(Date.now() + minutes * 60000);
      await prisma.room.update({
        where: { code },
        data: { timerEndsAt: endsAt }
      });
      const updatedRoom = await getFullRoom(code);
      if (updatedRoom) io.to(code).emit('roomUpdated', updatedRoom);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('clearTimer', async ({ code }) => {
    try {
      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return;
      await prisma.room.update({
        where: { code },
        data: { timerEndsAt: null, isLocked: false }
      });
      const updatedRoom = await getFullRoom(code);
      if (updatedRoom) io.to(code).emit('roomUpdated', updatedRoom);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('resetRoom', async ({ code }) => {
    try {
      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return;

      await prisma.word.deleteMany({ where: { roomId: room.id } });
      await prisma.qnaMessage.deleteMany({ where: { roomId: room.id } });
      await prisma.openAnswer.deleteMany({ where: { roomId: room.id } });
      
      await prisma.pollOption.updateMany({
        where: { roomId: room.id },
        data: { votes: 0, ratingTotal: 0, ratingCount: 0 }
      });

      const updatedRoom = await getFullRoom(code);
      if (updatedRoom) io.to(code).emit('roomUpdated', updatedRoom);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('submitVote', async ({ code, optionId }) => {
    try {
      const currentRoom = await prisma.room.findUnique({ where: { code } });
      if (!currentRoom || checkTimer(currentRoom)) return;

      await prisma.pollOption.update({
        where: { id: optionId },
        data: { votes: { increment: 1 } }
      });
      const room = await getFullRoom(code);
      if (room) io.to(code).emit('roomUpdated', room);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('submitWord', async ({ code, text, roomId }) => {
    try {
      const currentRoom = await prisma.room.findUnique({ where: { code } });
      if (!currentRoom || checkTimer(currentRoom)) return;

      const sanitizedText = sanitizeInput(text);
      if (!sanitizedText) return;

      const existing = await prisma.word.findFirst({
        where: { roomId, text: { equals: sanitizedText } }
      });
      
      if (existing) {
        await prisma.word.update({
          where: { id: existing.id },
          data: { count: { increment: 1 } }
        });
      } else {
        await prisma.word.create({
          data: { text: sanitizedText, roomId }
        });
      }

      const room = await getFullRoom(code);
      if (room) io.to(code).emit('roomUpdated', room);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('deleteWord', async ({ code, wordId }) => {
    try {
      await prisma.word.delete({
        where: { id: wordId }
      });
      const room = await getFullRoom(code);
      if (room) io.to(code).emit('roomUpdated', room);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('submitQna', async ({ code, text, roomId }) => {
    try {
      const currentRoom = await prisma.room.findUnique({ where: { code } });
      if (!currentRoom || checkTimer(currentRoom)) return;

      const sanitizedText = sanitizeInput(text);
      if (!sanitizedText) return;
      await prisma.qnaMessage.create({ data: { text: sanitizedText, roomId } });
      const room = await getFullRoom(code);
      if (room) io.to(code).emit('roomUpdated', room);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('upvoteQna', async ({ code, messageId }) => {
    try {
      await prisma.qnaMessage.update({
        where: { id: messageId },
        data: { upvotes: { increment: 1 } }
      });
      const room = await getFullRoom(code);
      if (room) io.to(code).emit('roomUpdated', room);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('deleteQna', async ({ code, messageId }) => {
    try {
      await prisma.qnaMessage.delete({
        where: { id: messageId }
      });
      const room = await getFullRoom(code);
      if (room) io.to(code).emit('roomUpdated', room);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('submitOpenAnswer', async ({ code, text, roomId }) => {
    try {
      const currentRoom = await prisma.room.findUnique({ where: { code } });
      if (!currentRoom || checkTimer(currentRoom)) return;

      const sanitizedText = sanitizeInput(text);
      if (!sanitizedText) return;
      await prisma.openAnswer.create({ data: { text: sanitizedText, roomId } });
      const room = await getFullRoom(code);
      if (room) io.to(code).emit('roomUpdated', room);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('deleteOpenAnswer', async ({ code, answerId }) => {
    try {
      await prisma.openAnswer.delete({
        where: { id: answerId }
      });
      const room = await getFullRoom(code);
      if (room) io.to(code).emit('roomUpdated', room);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('submitRanking', async ({ code, optionIds }) => {
    try {
      const currentRoom = await prisma.room.findUnique({ where: { code } });
      if (!currentRoom || checkTimer(currentRoom)) return;

      // optionIds is an array of IDs ordered from 1st to last.
      // points = N for 1st, N-1 for 2nd, etc.
      const N = optionIds.length;
      for (let i = 0; i < N; i++) {
        await prisma.pollOption.update({
          where: { id: optionIds[i] },
          data: { votes: { increment: N - i } }
        });
      }
      const room = await getFullRoom(code);
      if (room) io.to(code).emit('roomUpdated', room);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('submitRating', async ({ code, ratings }) => {
    try {
      const currentRoom = await prisma.room.findUnique({ where: { code } });
      if (!currentRoom || checkTimer(currentRoom)) return;

      // ratings is an object: { [optionId]: starValue }
      for (const [optionId, starValue] of Object.entries(ratings)) {
        await prisma.pollOption.update({
          where: { id: optionId },
          data: { 
            ratingTotal: { increment: parseInt(starValue, 10) },
            ratingCount: { increment: 1 }
          }
        });
      }
      const room = await getFullRoom(code);
      if (room) io.to(code).emit('roomUpdated', room);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
