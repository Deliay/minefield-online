import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { socketService } from './socket';

vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
    id: 'test-socket-id',
  };
  return {
    io: vi.fn(() => mockSocket),
  };
});

describe('socketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    socketService.disconnect();
  });

  describe('sessionId management', () => {
    it('should return null before connection', () => {
      expect(socketService.getSessionId()).toBeNull();
    });
  });

  describe('event listeners', () => {
    it('should have onScoreUpdate method', () => {
      expect(typeof socketService.onScoreUpdate).toBe('function');
    });

    it('should have onLeaderboard method', () => {
      expect(typeof socketService.onLeaderboard).toBe('function');
    });
  });
});
