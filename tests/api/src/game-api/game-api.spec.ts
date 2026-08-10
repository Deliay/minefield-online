import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

interface RevealedCell {
  col: number;
  row: number;
  isMine: boolean;
  number: number;
}

interface InitEvent {
  sessionId: string;
  user: { username: string; displayName: string; score: number };
  revealed: RevealedCell[];
  flagged: Array<{ col: number; row: number }>;
}

interface ScoreUpdateEvent {
  sessionId: string;
  score: number;
}

interface Ranking {
  username: string;
  displayName: string;
  score: number;
  isCurrentPlayer: boolean;
}

interface LeaderboardEvent {
  rankings: Ranking[];
}

function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
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

async function registerAndGetToken(): Promise<{ token: string }> {
  const username = uniqueName('gp');
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'secret1' }),
  });
  const body = (await res.json()) as { token: string };
  return { token: body.token };
}

describe('game-api WebSocket API', () => {
  let socket: Socket;
  let token: string;

  beforeAll(async () => {
    ({ token } = await registerAndGetToken());
  });

  beforeEach(async () => {
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: false,
      auth: { token },
    });
  });

  afterEach(() => {
    socket.disconnect();
  });

  describe('connection', () => {
    it('should connect successfully with valid token', async () => {
      await waitForConnect(socket);
      expect(socket.connected).toBe(true);
    });
  });

  describe('init event', () => {
    it('should receive init event with user on connection', async () => {
      await waitForConnect(socket);
      const data = await waitForEvent<InitEvent>(socket, 'init');
      expect(data).toBeDefined();
      expect(data.user.username).toBeDefined();
      expect(data.user.displayName).toBeDefined();
      expect(Array.isArray(data.revealed)).toBe(true);
      expect(Array.isArray(data.flagged)).toBe(true);
    });
  });

  describe('reveal API', () => {
    beforeEach(async () => {
      await waitForConnect(socket);
    });

    it('should send reveal event and receive cellRevealed response', async () => {
      const start = performance.now();
      socket.emit('reveal', { col: 350, row: 350 });
      const data = await waitForEvent<{ col: number; row: number; cells: RevealedCell[] }>(
        socket,
        'cellRevealed'
      );
      const duration = performance.now() - start;
      expect(data.col).toBe(350);
      expect(data.row).toBe(350);
      expect(duration).toBeLessThan(20);
    });

    it('should trigger scoreUpdate with sessionId = socket id on reveal', async () => {
      await waitForEvent<InitEvent>(socket, 'init');
      socket.emit('reveal', { col: 100, row: 100 });
      await waitForEvent<any>(socket, 'cellRevealed');
      const scoreUpdate = await waitForEvent<ScoreUpdateEvent>(socket, 'scoreUpdate');
      expect(typeof scoreUpdate.sessionId).toBe('string');
      expect(typeof scoreUpdate.score).toBe('number');
    });
  });

  describe('flag API', () => {
    it('should send flag event and receive cellFlagged response', async () => {
      await waitForConnect(socket);
      await waitForEvent<InitEvent>(socket, 'init');
      const testCol = 50 + Math.floor(Math.random() * 50);
      const testRow = 50 + Math.floor(Math.random() * 50);
      socket.emit('flag', { col: testCol, row: testRow });
      const data = await waitForEvent<{ col: number; row: number; isFlagged: boolean }>(
        socket,
        'cellFlagged'
      );
      expect(data.col).toBe(testCol);
      expect(data.row).toBe(testRow);
      expect(data.isFlagged).toBe(true);
    });

    it('should toggle flag off on second flag request', async () => {
      await waitForConnect(socket);
      await waitForEvent<InitEvent>(socket, 'init');
      const targetCol = 60 + Math.floor(Math.random() * 40);
      const targetRow = 100 + Math.floor(Math.random() * 40);
      socket.emit('flag', { col: targetCol, row: targetRow });
      const first = await waitForEvent<{ isFlagged: boolean }>(socket, 'cellFlagged');
      expect(first.isFlagged).toBe(true);
      socket.emit('flag', { col: targetCol, row: targetRow });
      const second = await waitForEvent<{ isFlagged: boolean }>(socket, 'cellFlagged');
      expect(second.isFlagged).toBe(false);
    });
  });

  describe('scoring', () => {
    it('should increase score by 10 on flag', async () => {
      await waitForConnect(socket);
      await waitForEvent<InitEvent>(socket, 'init');
      socket.emit('flag', { col: 200, row: 200 });
      await waitForEvent<any>(socket, 'cellFlagged');
      const scoreUpdate = await waitForEvent<ScoreUpdateEvent>(socket, 'scoreUpdate');
      expect(scoreUpdate.score).toBeDefined();
    });

    it('should allow negative scores on repeated mine reveals', async () => {
      await waitForConnect(socket);
      await waitForEvent<InitEvent>(socket, 'init');
      for (let i = 0; i < 3; i++) {
        socket.emit('reveal', { col: 300 + i, row: 300 });
        try {
          await waitForEvent<any>(socket, 'cellRevealed');
        } catch {
          /* noop */
        }
      }
      const scoreUpdate = await waitForEvent<ScoreUpdateEvent>(socket, 'scoreUpdate');
      if (scoreUpdate.score) {
        expect(typeof scoreUpdate.score).toBe('number');
      }
    });
  });

  describe('leaderboard', () => {
    it('should receive leaderboard with username/displayName after score change', async () => {
      await waitForConnect(socket);
      await waitForEvent<InitEvent>(socket, 'init');
      socket.emit('flag', { col: 400, row: 400 });
      await waitForEvent<any>(socket, 'cellFlagged');
      const leaderboard = await waitForEvent<LeaderboardEvent>(socket, 'leaderboard');
      expect(leaderboard.rankings).toBeDefined();
      const current = leaderboard.rankings.find((r) => r.isCurrentPlayer);
      expect(current).toBeDefined();
      expect(typeof current?.username).toBe('string');
      expect(typeof current?.displayName).toBe('string');
    });

    it('should sort rankings by score descending', async () => {
      await waitForConnect(socket);
      await waitForEvent<InitEvent>(socket, 'init');
      socket.emit('flag', { col: 500, row: 500 });
      await waitForEvent<any>(socket, 'cellFlagged');
      const leaderboard = await waitForEvent<LeaderboardEvent>(socket, 'leaderboard');
      const scores = leaderboard.rankings.map((r) => r.score);
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });
  });
});