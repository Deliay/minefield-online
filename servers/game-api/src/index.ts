import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import minefield from './minefield.js';
import { connectDB, disconnectDB } from './db.js';
import { authManager, AuthError } from './auth.js';
import {
  createSession,
  deleteSession,
  updateScore,
  updateDisplayName,
  getLeaderboard,
} from './session.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());

const bearerToken = (req: express.Request): string | undefined => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim();
};

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body ?? {};
  try {
    const result = await authManager.register(username, password);
    res.status(200).json({ token: result.token, user: result.user });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error('[register] unexpected:', err);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  try {
    const result = await authManager.login(username, password);
    if (result.previousSocketId) {
      const old = io.sockets.sockets.get(result.previousSocketId);
      if (old) {
        old.emit('forceLogout', { reason: 'kicked' });
        setTimeout(() => old.disconnect(true), 50);
      }
    }
    res.status(200).json({ token: result.token, user: result.user });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error('[login] unexpected:', err);
      res.status(500).json({ error: '服务器内部错误' });
    }
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = bearerToken(req);
  if (!token || !authManager.logout(token)) {
    res.status(401).json({ error: '无效的凭证' });
    return;
  }
  res.status(204).send();
});

io.use((socket, next) => {
  const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
  const username = authManager.getUserByToken(token);
  if (!username) {
    next(new Error('unauthorized'));
    return;
  }
  socket.data.username = username;
  socket.data.token = token;
  next();
});

const broadcastLeaderboard = () => {
  for (const s of io.sockets.sockets.values()) {
    s.emit('leaderboard', { rankings: getLeaderboard(s.id) });
  }
};

io.on('connection', async (socket) => {
  console.log('player connected:', socket.id, socket.data.username);
  const username: string = socket.data.username;

  const previousSocketId = authManager.getActiveSocketId(username);
  if (previousSocketId && previousSocketId !== socket.id) {
    const old = io.sockets.sockets.get(previousSocketId);
    if (old) {
      old.emit('forceLogout', { reason: 'kicked' });
      setTimeout(() => old.disconnect(true), 50);
    }
  }
  authManager.bindSocket(username, socket.id);

  const user = await authManager.findUserByUsername(username);
  const displayName = user?.displayName ?? username;
  const score = user?.score ?? 0;
  const session = createSession(username, displayName, socket.id, score);

  socket.emit('init', {
    sessionId: socket.id,
    user: { username, displayName, score },
    revealed: minefield.getAllRevealed(),
    flagged: minefield.getAllFlagged(),
  });

  broadcastLeaderboard();

  socket.on('reveal', async (data: { col: number; row: number }) => {
    const { col, row } = data;
    if (minefield.isRevealed(col, row) || minefield.isFlagged(col, row)) {
      io.emit('cellRevealed', { col, row, cells: [] });
      return;
    }
    const results = minefield.reveal(col, row);
    io.emit('cellRevealed', { col, row, cells: results });

    const hitMine = results.some(cell => cell.isMine);
    if (hitMine) {
      const updated = await updateScore(socket.id, -100);
      if (updated) {
        io.emit('scoreUpdate', { sessionId: socket.id, score: updated.score });
        broadcastLeaderboard();
      }
    }
  });

  socket.on('flag', async (data: { col: number; row: number }) => {
    const { col, row } = data;
    if (minefield.isRevealed(col, row)) {
      io.emit('cellFlagged', { col, row, isFlagged: false });
      return;
    }

    const cell = minefield.getCell(col, row);
    if (!cell) {
      io.emit('cellFlagged', { col, row, isFlagged: false });
      return;
    }

    if (minefield.isFlagged(col, row)) {
      return;
    }

    let scoreDelta = 0;

    if (cell.isMine) {
      const isFlagged = minefield.flag(col, row);
      io.emit('cellFlagged', { col, row, isFlagged });
      if (isFlagged) {
        scoreDelta = 10;
      }
    } else {
      const results = minefield.reveal(col, row);
      io.emit('cellFlagged', { col, row, isFlagged: false });
      io.emit('cellRevealed', { col, row, cells: results });
      scoreDelta = -20;
    }

    const updated = await updateScore(socket.id, scoreDelta);
    if (updated) {
      io.emit('scoreUpdate', { sessionId: socket.id, score: updated.score });
      broadcastLeaderboard();
    }
  });

  socket.on('chord', async (data: { col: number; row: number }) => {
    const { col, row } = data;
    const results = minefield.chord(col, row);
    io.emit('cellRevealed', { col, row, cells: results });

    const hitMine = results.some(cell => cell.isMine);
    if (hitMine) {
      const updated = await updateScore(socket.id, -100);
      if (updated) {
        io.emit('scoreUpdate', { sessionId: socket.id, score: updated.score });
        broadcastLeaderboard();
      }
    }
  });

  socket.on('setName', async (data: { name?: string }) => {
    const raw = typeof data?.name === 'string' ? data.name.trim() : '';
    if (!raw || raw.length > 20) {
      socket.emit('setNameError', { error: '名称不能为空且不超过20字符' });
      return;
    }
    const updated = await updateDisplayName(socket.id, raw);
    if (updated) {
      io.emit('setNameSuccess', { displayName: updated.displayName });
      broadcastLeaderboard();
    }
  });

  socket.on('reset', () => {
    minefield.reset();
    io.emit('reset');
  });

  socket.on('disconnect', () => {
    console.log('player disconnected:', socket.id);
    authManager.unbindSocket(username, socket.id);
    deleteSession(socket.id);
  });
});

(async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('[startup] MongoDB 连接失败，无法启动:', (err as Error).message);
    process.exit(1);
  }
})();

const shutdown = async () => {
  try {
    await disconnectDB();
  } catch {
    /* ignore */
  }
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
