import { describe, it, expect, afterEach } from 'vitest';
import { createSession, getSession, deleteSession, updateScore, getLeaderboard } from '../session.js';

describe('Session', () => {
  let socketsToClean: string[] = [];

  afterEach(() => {
    socketsToClean.forEach(deleteSession);
    socketsToClean.length = 0;
  });

  const createTestSession = (socketId: string) => {
    const session = createSession(socketId);
    socketsToClean.push(socketId);
    return session;
  };

  describe('createSession', () => {
    it('should create a session with initial score 0', () => {
      const session = createTestSession('socket-1');
      expect(session.socketId).toBe('socket-1');
      expect(session.score).toBe(0);
      expect(session.sessionId).toBeDefined();
      expect(session.createdAt).toBeDefined();
    });

    it('should store session in map', () => {
      const session = createTestSession('socket-2');
      const retrieved = getSession('socket-2');
      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe(session.sessionId);
    });
  });

  describe('getSession', () => {
    it('should return undefined for non-existent socket', () => {
      const session = getSession('non-existent');
      expect(session).toBeUndefined();
    });

    it('should return session for existing socket', () => {
      const created = createTestSession('socket-3');
      const retrieved = getSession('socket-3');
      expect(retrieved).toEqual(created);
    });
  });

  describe('deleteSession', () => {
    it('should remove session from map', () => {
      createTestSession('socket-4');
      deleteSession('socket-4');
      const retrieved = getSession('socket-4');
      expect(retrieved).toBeUndefined();
      socketsToClean.splice(socketsToClean.indexOf('socket-4'), 1);
    });

    it('should not throw for non-existent socket', () => {
      expect(() => deleteSession('non-existent')).not.toThrow();
    });
  });

  describe('updateScore', () => {
    it('should add points to score', () => {
      createTestSession('socket-5');
      const updated = updateScore('socket-5', 10);
      expect(updated?.score).toBe(10);
    });

    it('should subtract points from score', () => {
      createTestSession('socket-6');
      const updated = updateScore('socket-6', -100);
      expect(updated?.score).toBe(-100);
    });

    it('should allow negative scores', () => {
      createTestSession('socket-7');
      updateScore('socket-7', -50);
      const updated = updateScore('socket-7', -50);
      expect(updated?.score).toBe(-100);
    });

    it('should return undefined for non-existent socket', () => {
      const updated = updateScore('non-existent', 10);
      expect(updated).toBeUndefined();
    });

    it('should accumulate score changes', () => {
      createTestSession('socket-8');
      updateScore('socket-8', 10);
      updateScore('socket-8', 10);
      updateScore('socket-8', -100);
      const session = getSession('socket-8');
      expect(session?.score).toBe(-80);
    });
  });

  describe('getLeaderboard', () => {
    it('should return empty array when no sessions', () => {
      const leaderboard = getLeaderboard();
      expect(leaderboard).toEqual([]);
    });

    it('should return sessions sorted by score descending', () => {
      createTestSession('socket-10');
      createTestSession('socket-11');
      createTestSession('socket-12');

      updateScore('socket-10', 100);
      updateScore('socket-11', 50);
      updateScore('socket-12', 200);

      const leaderboard = getLeaderboard();
      expect(leaderboard[0].score).toBe(200);
      expect(leaderboard[1].score).toBe(100);
      expect(leaderboard[2].score).toBe(50);
    });

    it('should sort by createdAt ascending for tied scores', () => {
      createTestSession('socket-tie-1');
      createTestSession('socket-tie-2');

      updateScore('socket-tie-1', 100);
      updateScore('socket-tie-2', 100);

      const leaderboard = getLeaderboard();
      expect(leaderboard[0].score).toBe(100);
      expect(leaderboard[1].score).toBe(100);
    });

    it('should truncate sessionId to 6 characters', () => {
      const session = createTestSession('socket-13');
      const leaderboard = getLeaderboard();
      expect(leaderboard[0].sessionId.length).toBe(6);
      expect(leaderboard[0].sessionId).toBe(session.sessionId.slice(0, 6));
    });

    it('should mark current player', () => {
      createTestSession('socket-14');
      const leaderboard = getLeaderboard('socket-14');
      expect(leaderboard[0].isCurrentPlayer).toBe(true);
    });

    it('should not mark other players as current', () => {
      createTestSession('socket-15');
      createTestSession('socket-16');
      const leaderboard = getLeaderboard('socket-15');
      expect(leaderboard.filter(r => r.isCurrentPlayer)).toHaveLength(1);
    });

    it('should handle empty currentSocketId', () => {
      createTestSession('socket-17');
      const leaderboard = getLeaderboard();
      expect(leaderboard.every(r => r.isCurrentPlayer === false)).toBe(true);
    });
  });
});