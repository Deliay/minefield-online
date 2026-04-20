import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

interface RevealedCell {
  col: number;
  row: number;
  isMine: boolean;
  number: number;
}

interface InitEvent {
  revealed: RevealedCell[];
  flagged: Array<{ col: number; row: number }>;
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
    beforeEach(async () => {
      await waitForConnect(socket);
      await new Promise<void>((resolve) => {
        socket.once('init', () => {
          socket.once('reset', () => resolve());
          socket.emit('reset');
        });
      });
    });

    it('should send reveal event and receive cellRevealed response within 20ms', async () => {
      const start = performance.now();
      socket.emit('reveal', { col: 350, row: 350 });

      const data = await waitForEvent<{ col: number; row: number; cells: RevealedCell[] }>(socket, 'cellRevealed');
      const duration = performance.now() - start;

      expect(data.col).toBe(350);
      expect(data.row).toBe(350);
      expect(duration).toBeLessThan(20);
    });

    it('should reveal 100 cells with max response time under 25ms', async () => {
      const revealedKeys = new Set<string>();
      const testCells: { col: number; row: number }[] = [];
      for (let col = 900; col < 910 && testCells.length < 100; col += 1) {
        for (let row = 500; row < 510 && testCells.length < 100; row += 1) {
          testCells.push({ col, row });
        }
      }

      expect(testCells.length).toBeGreaterThanOrEqual(100);

      const times: number[] = [];
      let successCount = 0;

      for (let i = 0; i < testCells.length && i < 100; i++) {
        const cell = testCells[i];
        const key = `${cell.col},${cell.row}`;
        if (revealedKeys.has(key)) {
          successCount++;
          continue;
        }
        const start = performance.now();
        socket.emit('reveal', cell);
        try {
          const data = await waitForEvent<{ col: number; row: number; cells: RevealedCell[] }>(socket, 'cellRevealed');
          const duration = performance.now() - start;
          times.push(duration);
          for (const c of data.cells) {
            revealedKeys.add(`${c.col},${c.row}`);
          }
          successCount++;
        } catch (e) {
          break;
        }
      }

      expect(successCount).toBeGreaterThanOrEqual(100);

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      expect(maxTime).toBeLessThan(25);
      expect(avgTime).toBeLessThan(15);
    });
  });

  describe('flag API', () => {
    it('should send flag event and receive cellFlagged response', async () => {
      await waitForConnect(socket);
      await waitForEvent<InitEvent>(socket, 'init');

      const testCol = 50 + Math.floor(Math.random() * 50);
      const testRow = 50 + Math.floor(Math.random() * 50);
      socket.emit('flag', { col: testCol, row: testRow });
      const data = await waitForEvent<{ col: number; row: number; isFlagged: boolean }>(socket, 'cellFlagged');

      expect(data.col).toBe(testCol);
      expect(data.row).toBe(testRow);
      expect(data.isFlagged).toBe(true);
    });

    it('should toggle flag off on second flag request', async () => {
      await waitForConnect(socket);
      await waitForEvent<InitEvent>(socket, 'init');

      const targetCol = 50 + Math.floor(Math.random() * 50);
      const targetRow = 100 + Math.floor(Math.random() * 50);

      socket.emit('flag', { col: targetCol, row: targetRow });
      const firstResponse = await waitForEvent<{ col: number; row: number; isFlagged: boolean }>(socket, 'cellFlagged');
      expect(firstResponse.isFlagged).toBe(true);

      socket.emit('flag', { col: targetCol, row: targetRow });
      const secondResponse = await waitForEvent<{ col: number; row: number; isFlagged: boolean }>(socket, 'cellFlagged');
      expect(secondResponse.isFlagged).toBe(false);
    });
  });

  describe('state sync', () => {
    it('should sync revealed cells to newly connected client', async () => {
      await waitForConnect(socket);
      await waitForEvent<InitEvent>(socket, 'init');

      const testCol = 50 + Math.floor(Math.random() * 50);
      const testRow = 150 + Math.floor(Math.random() * 50);
      socket.emit('reveal', { col: testCol, row: testRow });
      await waitForEvent<any>(socket, 'cellRevealed');

      const newSocket = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: false,
      });

      try {
        await waitForConnect(newSocket);
        const data = await waitForEvent<InitEvent>(newSocket, 'init');

        const found = data.revealed.some(r => r.col === testCol && r.row === testRow);
        expect(found).toBe(true);
      } finally {
        newSocket.disconnect();
      }
    });
  });
});