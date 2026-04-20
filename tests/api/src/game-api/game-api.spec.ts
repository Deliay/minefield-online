import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

interface RevealedCell {
  isMine: boolean;
  number: number;
}

interface InitEvent {
  revealed: Array<{ col: number; row: number; cell: RevealedCell }>;
  flagged: Array<{ col: number; row: number }>;
}

let testCounter = 0;

function nextCell(): { col: number; row: number } {
  testCounter += 10;
  return { col: 100 + testCounter, row: 100 + testCounter };
}

function waitForEvent<T>(socket: Socket, event: string, timeout = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);

    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function waitForConnect(socket: Socket, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, timeout);

    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });

    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(new Error('Connection error: ' + err.message));
    });
  });
}

describe('game-api WebSocket API', () => {
  let socket: Socket;

  beforeEach(() => {
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: false,
    });
  });

  afterEach(() => {
    socket.disconnect();
  });

  describe('connection', () => {
    it('should connect successfully', async () => {
      await waitForConnect(socket);
      expect(socket.connected).toBe(true);
    });
  });

  describe('init event', () => {
    it('should receive init event on connection', async () => {
      await waitForConnect(socket);
      const data = await waitForEvent<InitEvent>(socket, 'init');
      expect(data).toBeDefined();
      expect(Array.isArray(data.revealed)).toBe(true);
      expect(Array.isArray(data.flagged)).toBe(true);
    });
  });

  describe('reveal API', () => {
    it('should send reveal event and receive cellRevealed response within 20ms', async () => {
      await waitForConnect(socket);
      await waitForEvent<InitEvent>(socket, 'init');

      const cell = nextCell();
      const start = performance.now();
      socket.emit('reveal', cell);

      const data = await waitForEvent<{ col: number; row: number; cells: RevealedCell[] }>(socket, 'cellRevealed');
      const duration = performance.now() - start;

      expect(data.col).toBe(cell.col);
      expect(data.row).toBe(cell.row);
      expect(duration).toBeLessThan(20);
    });

    it('should reveal multiple cells within 20ms each on average', async () => {
      await waitForConnect(socket);
      await waitForEvent<InitEvent>(socket, 'init');

      const times: number[] = [];

      for (let i = 0; i < 5; i++) {
        const cell = nextCell();
        const start = performance.now();
        socket.emit('reveal', cell);
        await waitForEvent<any>(socket, 'cellRevealed');
        const duration = performance.now() - start;
        times.push(duration);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      expect(maxTime).toBeLessThan(20);
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('flag API', () => {
    it('should send flag event and receive cellFlagged response', async () => {
      await waitForConnect(socket);
      const initData = await waitForEvent<InitEvent>(socket, 'init');

      const cell = nextCell();
      const alreadyFlagged = initData.flagged.some(f => f.col === cell.col && f.row === cell.row);
      if (alreadyFlagged) {
        socket.emit('flag', cell);
        await waitForEvent<any>(socket, 'cellFlagged');
        cell.col += 50;
        cell.row += 50;
      }

      socket.emit('flag', cell);
      const data = await waitForEvent<{ col: number; row: number; isFlagged: boolean }>(socket, 'cellFlagged');

      expect(data.col).toBe(cell.col);
      expect(data.row).toBe(cell.row);
      expect(data.isFlagged).toBe(true);
    });

    it('should toggle flag off on second flag request', async () => {
      await waitForConnect(socket);
      await waitForEvent<InitEvent>(socket, 'init');

      const cell = nextCell();

      socket.emit('flag', cell);
      const firstResponse = await waitForEvent<{ col: number; row: number; isFlagged: boolean }>(socket, 'cellFlagged');
      expect(firstResponse.isFlagged).toBe(true);

      socket.emit('flag', cell);
      const secondResponse = await waitForEvent<{ col: number; row: number; isFlagged: boolean }>(socket, 'cellFlagged');
      expect(secondResponse.isFlagged).toBe(false);
    });
  });

  describe('state sync', () => {
    it('should sync revealed cells to newly connected client', async () => {
      await waitForConnect(socket);
      const initData = await waitForEvent<InitEvent>(socket, 'init');

      const unrevealedCell = nextCell();
      const alreadyRevealed = initData.revealed.some(r => r.col === unrevealedCell.col && r.row === unrevealedCell.row);
      if (alreadyRevealed) {
        const differentCell = { col: unrevealedCell.col + 100, row: unrevealedCell.row + 100 };
        const alsoRevealed = initData.revealed.some(r => r.col === differentCell.col && r.row === differentCell.row);
        if (alsoRevealed) {
          unrevealedCell.col += 200;
          unrevealedCell.row += 200;
        } else {
          unrevealedCell.col = differentCell.col;
          unrevealedCell.row = differentCell.row;
        }
      }

      socket.emit('reveal', unrevealedCell);
      await waitForEvent<any>(socket, 'cellRevealed');

      const newSocket = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: false,
      });

      try {
        await waitForConnect(newSocket);
        const data = await waitForEvent<InitEvent>(newSocket, 'init');

        const found = data.revealed.some(r => r.col === unrevealedCell.col && r.row === unrevealedCell.row);
        expect(found).toBe(true);
      } finally {
        newSocket.disconnect();
      }
    });
  });
});