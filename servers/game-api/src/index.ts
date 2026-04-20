import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import minefield from './minefield.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('player connected:', socket.id);

  socket.emit('init', {
    revealed: minefield.getAllRevealed(),
    flagged: minefield.getAllFlagged(),
  });

  socket.on('reveal', (data: { col: number; row: number }) => {
    const { col, row } = data;
    if (minefield.isRevealed(col, row) || minefield.isFlagged(col, row)) {
      io.emit('cellRevealed', { col, row, cells: [] });
      return;
    }
    const results = minefield.reveal(col, row);
    io.emit('cellRevealed', { col, row, cells: results });
  });

  socket.on('flag', (data: { col: number; row: number }) => {
    const { col, row } = data;
    const isFlagged = minefield.flag(col, row);
    io.emit('cellFlagged', { col, row, isFlagged });
  });

  socket.on('reset', () => {
    minefield.reset();
    io.emit('reset');
  });

  socket.on('disconnect', () => console.log('player disconnected:', socket.id));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));