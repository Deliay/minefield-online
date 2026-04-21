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
  sessionId: string;
  revealed: RevealedCell[];
  flagged: Array<{ col: number; row: number }>;
}

interface ScoreUpdateEvent {
  sessionId: string;
  score: number;
}

interface LeaderboardEvent {
  rankings: Array<{ sessionId: string; score: number; isCurrentPlayer: boolean }>;
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

function waitForConnectAndInit(socket: Socket, timeout = 5000): Promise<InitEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Connection or init timeout'));
    }, timeout);

    const onInit = (data: InitEvent) => {
      clearTimeout(timer);
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      resolve(data);
    };

    const onConnect = () => {
      socket.once('init', onInit);
    };

    const onConnectError = (err: Error) => {
      clearTimeout(timer);
      socket.off('init', onInit);
      reject(new Error('Connection error: ' + err.message));
    };

    if (socket.connected) {
      socket.once('init', onInit);
    } else {
      socket.once('connect', onConnect);
      socket.once('connect_error', onConnectError);
    }
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
        socket.once('reset', () => resolve());
        socket.emit('reset');
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

    it('should expand adjacent 0 cells when clicking on a non-zero number cell', async () => {
      socket.emit('reveal', { col: 350, row: 350 });

      const data = await waitForEvent<{ col: number; row: number; cells: RevealedCell[] }>(socket, 'cellRevealed');

      const cellMap = new Map<string, number>();
      for (const cell of data.cells) {
        cellMap.set(`${cell.col},${cell.row}`, cell.number);
      }

      const clickedCell = cellMap.get(`${350},${350}`);
      expect(clickedCell).toBeDefined();
      if (clickedCell && clickedCell > 0) {
        let hasAdjacentZero = false;
        for (let dy = -1; dy <= 1 && !hasAdjacentZero; dy++) {
          for (let dx = -1; dx <= 1 && !hasAdjacentZero; dx++) {
            if (dx === 0 && dy === 0) continue;
            const adjNum = cellMap.get(`${350 + dx},${350 + dy}`);
            if (adjNum === 0) hasAdjacentZero = true;
          }
        }
        if (hasAdjacentZero) {
          let hasExpandedZero = false;
          for (const [key, num] of cellMap) {
            if (num === 0 && key !== '350,350') {
              hasExpandedZero = true;
              break;
            }
          }
          expect(hasExpandedZero).toBe(true);
        }
      }
    });

    it('should receive response for ALL rapid reveal requests (no dropped responses)', async () => {
      const cellRevealedEvents: { col: number; row: number; cells: RevealedCell[] }[] = [];
      socket.on('cellRevealed', (data) => {
        cellRevealedEvents.push(data);
      });

      await waitForConnect(socket);

      await new Promise<void>((resolve) => {
        socket.once('reset', () => resolve());
        socket.emit('reset');
      });

      const cellsToReveal = [
        { col: 350, row: 350 },
        { col: 351, row: 350 },
        { col: 352, row: 350 },
        { col: 353, row: 350 },
        { col: 354, row: 350 },
      ];

      for (const cell of cellsToReveal) {
        socket.emit('reveal', cell);
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(cellRevealedEvents.length).toBe(cellsToReveal.length);
    }, 10000);

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

  describe('scoring', () => {
    it('should receive sessionId in init event', async () => {
      await waitForConnect(socket);
      const data = await waitForEvent<InitEvent>(socket, 'init');
      expect(data.sessionId).toBeDefined();
      expect(typeof data.sessionId).toBe('string');
      expect(data.sessionId.length).toBeGreaterThan(0);
    });

    it('should decrease score by 100 on reveal (mine hit)', async () => {
      await waitForConnect(socket);
      const initData = await waitForEvent<InitEvent>(socket, 'init');
      const sessionId = initData.sessionId;

      socket.emit('reset');

      const startScore = 0;
      let hitMine = false;

      for (let attempt = 0; attempt < 20 && !hitMine; attempt++) {
        const col = 100 + attempt;
        const row = 100 + attempt;
        socket.emit('reveal', { col, row });
        const result = await waitForEvent<any>(socket, 'cellRevealed');
        if (result.cells.some((c: any) => c.isMine)) {
          hitMine = true;
          const scoreUpdate = await waitForEvent<ScoreUpdateEvent>(socket, 'scoreUpdate');
          expect(scoreUpdate.sessionId).toBe(sessionId);
          expect(scoreUpdate.score).toBe(startScore - 100);
        }
      }

      expect(hitMine).toBe(true);
    });

    it('should increase score by 10 on flag', async () => {
      await waitForConnect(socket);
      const initData = await waitForEvent<InitEvent>(socket, 'init');
      const sessionId = initData.sessionId;

      socket.emit('reset');
      await waitForEvent<any>(socket, 'reset');

      socket.emit('flag', { col: 200, row: 200 });
      await waitForEvent<any>(socket, 'cellFlagged');

      const scoreUpdate = await waitForEvent<ScoreUpdateEvent>(socket, 'scoreUpdate');
      expect(scoreUpdate.sessionId).toBe(sessionId);
      expect(scoreUpdate.score).toBe(10);
    });

    it('should allow negative scores', async () => {
      await waitForConnect(socket);
      const initData = await waitForEvent<InitEvent>(socket, 'init');
      const sessionId = initData.sessionId;

      socket.emit('reset');
      await waitForEvent<any>(socket, 'reset');

      let minesHit = 0;
      for (let i = 0; i < 30 && minesHit < 3; i++) {
        const col = 300 + i;
        const row = 300 + (i % 10);
        socket.emit('reveal', { col, row });
        try {
          const result = await waitForEvent<any>(socket, 'cellRevealed');
          if (result.cells.some((c: any) => c.isMine)) {
            minesHit++;
            await waitForEvent<ScoreUpdateEvent>(socket, 'scoreUpdate');
          }
        } catch {}
      }

      expect(minesHit).toBeGreaterThanOrEqual(3);
    });
  });

  describe('leaderboard', () => {
    it('should receive leaderboard event after score change', async () => {
      await waitForConnect(socket);
      const initData = await waitForEvent<InitEvent>(socket, 'init');

      socket.emit('reset');

      socket.emit('flag', { col: 400, row: 400 });
      await waitForEvent<any>(socket, 'cellFlagged');

      const leaderboard = await waitForEvent<LeaderboardEvent>(socket, 'leaderboard');
      expect(leaderboard.rankings).toBeDefined();
      expect(Array.isArray(leaderboard.rankings)).toBe(true);

      const currentPlayerEntry = leaderboard.rankings.find(r => r.isCurrentPlayer);
      expect(currentPlayerEntry).toBeDefined();
      expect(currentPlayerEntry?.sessionId).toBe(initData.sessionId.slice(0, 6));
    });

    it('should sort rankings by score descending', async () => {
      await waitForConnect(socket);

      socket.emit('reset');

      for (let i = 0; i < 3; i++) {
        socket.emit('flag', { col: 500 + i, row: 500 });
        await waitForEvent<any>(socket, 'cellFlagged');
      }

      const leaderboard = await waitForEvent<LeaderboardEvent>(socket, 'leaderboard');
      const scores = leaderboard.rankings.map(r => r.score);

      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });

    it('should display only first 6 characters of sessionId', async () => {
      await waitForConnect(socket);

      socket.emit('reset');

      socket.emit('flag', { col: 600, row: 600 });
      await waitForEvent<any>(socket, 'cellFlagged');

      const leaderboard = await waitForEvent<LeaderboardEvent>(socket, 'leaderboard');
      const currentPlayerEntry = leaderboard.rankings.find(r => r.isCurrentPlayer);

      expect(currentPlayerEntry?.sessionId.length).toBeLessThanOrEqual(6);
    });

    it('should receive leaderboard update when new player joins', async () => {
      await waitForConnect(socket);
      await waitForEvent<InitEvent>(socket, 'init');
      socket.emit('reset');
      await waitForEvent<any>(socket, 'reset');

      const leaderboardEvents: LeaderboardEvent[] = [];
      socket.on('leaderboard', (data: LeaderboardEvent) => {
        leaderboardEvents.push(data);
      });

      const socketB = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: false,
      });
      await waitForConnect(socketB);
      await waitForEvent<InitEvent>(socketB, 'init');
      socketB.disconnect();

      await new Promise(resolve => setTimeout(resolve, 500));

      const hasNewPlayerLeaderboardUpdate = leaderboardEvents.some(
        lb => lb.rankings.length > 1
      );
      expect(hasNewPlayerLeaderboardUpdate).toBe(true);
    });

    it('should receive leaderboard update when player disconnects', async () => {
      const socketA = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: false,
      });
      const socketB = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: false,
      });

      await waitForConnectAndInit(socketA);
      socketA.emit('reset');
      await waitForEvent<any>(socketA, 'reset');

      await waitForConnectAndInit(socketB);
      socketB.emit('reset');
      await waitForEvent<any>(socketB, 'reset');

      const leaderboardEventsA: LeaderboardEvent[] = [];
      socketA.on('leaderboard', (data: LeaderboardEvent) => {
        leaderboardEventsA.push(data);
      });

      socketB.disconnect();
      await new Promise(resolve => setTimeout(resolve, 500));

      const hasDisconnectLeaderboardUpdate = leaderboardEventsA.some(
        lb => lb.rankings.length === 1
      );
      expect(hasDisconnectLeaderboardUpdate).toBe(true);

      socketA.disconnect();
    });
  });

  describe('session persistence', () => {
    it('should restore score when reconnecting with same sessionId', async () => {
      const socketA = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: false,
      });

      const initData = await waitForConnectAndInit(socketA);
      const originalSessionId = initData.sessionId;

      socketA.emit('reset');
      await waitForEvent<any>(socketA, 'reset');

      socketA.emit('flag', { col: 700, row: 700 });
      await waitForEvent<any>(socketA, 'cellFlagged');
      await waitForEvent<any>(socketA, 'scoreUpdate');

      socketA.disconnect();

      const socketB = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: false,
        auth: { sessionId: originalSessionId },
      });

      const reconnectData = await waitForConnectAndInit(socketB);

      expect(reconnectData.sessionId).toBe(originalSessionId);

      socketB.emit('flag', { col: 701, row: 701 });
      await waitForEvent<any>(socketB, 'cellFlagged');
      const scoreUpdate = await waitForEvent<ScoreUpdateEvent>(socketB, 'scoreUpdate');

      expect(scoreUpdate.score).toBe(20);

      socketB.disconnect();
    });

    it('should create new sessionId when no existing sessionId is provided', async () => {
      await waitForConnect(socket);
      const initData1 = await waitForEvent<InitEvent>(socket, 'init');
      const firstSessionId = initData1.sessionId;

      socket.disconnect();

      const socketC = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: false,
      });

      await waitForConnect(socketC);
      const initData2 = await waitForEvent<InitEvent>(socketC, 'init');

      expect(initData2.sessionId).not.toBe(firstSessionId);

      socketC.disconnect();
    });

    it('should keep score for resumed session, not create new one', async () => {
      const socketA = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: false,
      });

      await waitForConnect(socketA);
      const initData = await waitForEvent<InitEvent>(socketA, 'init');
      const originalSessionId = initData.sessionId;

      socketA.emit('reset');
      await waitForEvent<any>(socketA, 'reset');

      socketA.emit('flag', { col: 800, row: 800 });
      await waitForEvent<any>(socketA, 'cellFlagged');
      await waitForEvent<any>(socketA, 'scoreUpdate');

      socketA.disconnect();

      const socketB = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: false,
      });

      await waitForConnect(socketB);
      const newInitData = await waitForEvent<InitEvent>(socketB, 'init');
      const newSessionId = newInitData.sessionId;

      expect(newSessionId).not.toBe(originalSessionId);

      socketB.disconnect();
    });
  });
});