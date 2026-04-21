import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import minefield from './minefield.js';
import { createSession, deleteSession, updateScore, getLeaderboard, getSessionBySessionId } from './session.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('player connected:', socket.id);

  const clientSessionId = socket.handshake.auth.sessionId as string | undefined;
  const existingSession = clientSessionId ? getSessionBySessionId(clientSessionId) : undefined;

  const session = createSession(socket.id, clientSessionId);
  if (existingSession) {
    session.score = existingSession.score;
    session.createdAt = existingSession.createdAt;
  }

  console.log('session:', existingSession ? `resumed ${session.sessionId}` : `created ${session.sessionId}`);

  socket.emit('init', {
    sessionId: session.sessionId,
    revealed: minefield.getAllRevealed(),
    flagged: minefield.getAllFlagged(),
  });

  io.emit('leaderboard', { rankings: getLeaderboard(session.sessionId) });

  socket.on('reveal', (data: { col: number; row: number }) => {
    const { col, row } = data;
    if (minefield.isRevealed(col, row) || minefield.isFlagged(col, row)) {
      io.emit('cellRevealed', { col, row, cells: [] });
      return;
    }
    const results = minefield.reveal(col, row);
    io.emit('cellRevealed', { col, row, cells: results });

    const hitMine = results.some(cell => cell.isMine);
    if (hitMine) {
      const updated = updateScore(session.sessionId, -100);
      if (updated) {
        io.emit('scoreUpdate', { sessionId: updated.sessionId, score: updated.score });
        io.emit('leaderboard', { rankings: getLeaderboard(session.sessionId) });
      }
    }
  });

  socket.on('flag', (data: { col: number; row: number }) => {
    const { col, row } = data;
    const isFlagged = minefield.flag(col, row);
    io.emit('cellFlagged', { col, row, isFlagged });

    const updated = updateScore(session.sessionId, 10);
    if (updated) {
      io.emit('scoreUpdate', { sessionId: updated.sessionId, score: updated.score });
      io.emit('leaderboard', { rankings: getLeaderboard(session.sessionId) });
    }
  });

  socket.on('reset', () => {
    minefield.reset();
    io.emit('reset');
  });

  socket.on('disconnect', () => {
    console.log('player disconnected:', socket.id);
    // NOTE: We intentionally do NOT delete the session here for session persistence.
    // The session will persist across page refreshes so users can resume their score.
    // Sessions are only truly deleted when the server restarts.
    io.emit('leaderboard', { rankings: getLeaderboard() });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));