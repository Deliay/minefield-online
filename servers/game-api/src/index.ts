import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import minefield from './minefield.js';
import { createSession, deleteSession, updateScore, updateName, getLeaderboard, getSessionBySessionId, sessions } from './session.js';

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

    io.emit('leaderboard', { rankings: getLeaderboard() });

    socket.on('setName', (data: { name: string }) => {
      const updated = updateName(session.sessionId, data.name);
      if (updated) {
        io.emit('leaderboard', { rankings: getLeaderboard() });
      }
    });

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
          for (const [, s] of sessions) {
            socket.to(s.socketId).emit('leaderboard', { rankings: getLeaderboard(s.sessionId) });
          }
        }
      }
    });

    socket.on('flag', (data: { col: number; row: number }) => {
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

      const updated = updateScore(session.sessionId, scoreDelta);
      if (updated) {
        io.emit('scoreUpdate', { sessionId: updated.sessionId, score: updated.score });
        io.emit('leaderboard', { rankings: getLeaderboard() });
      }
    });

    socket.on('chord', (data: { col: number; row: number }) => {
      const { col, row } = data;
      const results = minefield.chord(col, row);
      io.emit('cellRevealed', { col, row, cells: results });

      const hitMine = results.some(cell => cell.isMine);
      if (hitMine) {
        const updated = updateScore(session.sessionId, -100);
        if (updated) {
          io.emit('scoreUpdate', { sessionId: updated.sessionId, score: updated.score });
          io.emit('leaderboard', { rankings: getLeaderboard() });
        }
      }
    });

    socket.on('reset', () => {
      minefield.reset();
      io.emit('reset');
    });

    socket.on('disconnect', () => {
      console.log('player disconnected:', socket.id);
      io.emit('leaderboard', { rankings: getLeaderboard() });
    });
  });

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));