import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSession,
  getSession,
  deleteSession,
  updateScore,
  getLeaderboard,
} from '../session.js';

vi.mock('../db.js', () => ({
  User: {
    findOneAndUpdate: vi.fn(),
  },
}));

import { User } from '../db.js';

describe('Session', () => {
  let socketsToClean: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    socketsToClean.forEach(deleteSession);
    socketsToClean.length = 0;
  });

  const createTestSession = (socketId: string, username = `user-${socketId}`) => {
    const session = createSession(username, username, socketId, 0);
    socketsToClean.push(socketId);
    return session;
  };

  describe('createSession', () => {
    it('should bind a session to a username with initial score 0', () => {
      const session = createTestSession('socket-1', 'alice');
      expect(session.socketId).toBe('socket-1');
      expect(session.username).toBe('alice');
      expect(session.displayName).toBe('alice');
      expect(session.score).toBe(0);
      expect(session.createdAt).toBeDefined();
    });

    it('should store session in map keyed by socketId', () => {
      const session = createTestSession('socket-2');
      const retrieved = getSession('socket-2');
      expect(retrieved).toBe(session);
    });
  });

  describe('getSession', () => {
    it('should return undefined for non-existent socket', () => {
      expect(getSession('non-existent')).toBeUndefined();
    });

    it('should return session for existing socket', () => {
      const created = createTestSession('socket-3');
      expect(getSession('socket-3')).toEqual(created);
    });
  });

  describe('deleteSession', () => {
    it('should remove session from map', () => {
      createTestSession('socket-4');
      deleteSession('socket-4');
      expect(getSession('socket-4')).toBeUndefined();
      socketsToClean.splice(socketsToClean.indexOf('socket-4'), 1);
    });

    it('should not throw for non-existent socket', () => {
      expect(() => deleteSession('non-existent')).not.toThrow();
    });
  });

  describe('updateScore', () => {
    it('should persist via $inc and reflect new score, then session updated', async () => {
      const session = createTestSession('socket-5');
      (User.findOneAndUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
        collation: vi.fn(async () => ({
          username: session.username,
          displayName: session.displayName,
          score: 30,
        })),
      });
      const updated = await updateScore('socket-5', 30);
      expect(updated?.score).toBe(30);
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { username: 'user-socket-5' },
        { $inc: { score: 30 } },
        { new: true }
      );
    });

    it('should return null when db write fails (no broadcast)', async () => {
      createTestSession('socket-6');
      (User.findOneAndUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
        collation: vi.fn(async () => null),
      });
      const updated = await updateScore('socket-6', 10);
      expect(updated).toBeNull();
      expect(getSession('socket-6')?.score).toBe(0);
    });

    it('should return null for non-existent socket', async () => {
      const updated = await updateScore('non-existent', 10);
      expect(updated).toBeNull();
    });
  });

  describe('getLeaderboard', () => {
    it('should return empty array when no sessions', () => {
      expect(getLeaderboard()).toEqual([]);
    });

    it('should return sessions sorted by score descending with displayName identity', () => {
      const a = createTestSession('socket-10', 'alice');
      const b = createTestSession('socket-11', 'bob');
      const c = createTestSession('socket-12', 'carol');
      a.score = 100;
      b.score = 50;
      c.score = 200;

      const leaderboard = getLeaderboard();
      expect(leaderboard[0].username).toBe('carol');
      expect(leaderboard[0].displayName).toBe('carol');
      expect(leaderboard[0].score).toBe(200);
      expect(leaderboard[1].username).toBe('alice');
      expect(leaderboard[1].score).toBe(100);
      expect(leaderboard[2].username).toBe('bob');
      expect(leaderboard[2].score).toBe(50);
    });

    it('should sort by createdAt ascending for tied scores', () => {
      const first = createTestSession('socket-tie-1', 'u1');
      const second = createTestSession('socket-tie-2', 'u2');
      first.createdAt = 100;
      second.createdAt = 200;
      first.score = 100;
      second.score = 100;

      const leaderboard = getLeaderboard();
      expect(leaderboard[0].username).toBe('u1');
      expect(leaderboard[1].username).toBe('u2');
    });

    it('should mark current player by socketId', () => {
      createTestSession('socket-14');
      const leaderboard = getLeaderboard('socket-14');
      expect(leaderboard[0].isCurrentPlayer).toBe(true);
    });

    it('should expose username & displayName (no truncated sessionId)', () => {
      const session = createTestSession('socket-15', 'alice');
      const leaderboard = getLeaderboard();
      expect(leaderboard[0].username).toBe('alice');
      expect(leaderboard[0].displayName).toBe('alice');
      expect('sessionId' in leaderboard[0]).toBe(false);
      void session;
    });
  });
});