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

vi.mock('./api', () => ({
  getToken: vi.fn(() => 'test-token'),
}));

import { io } from 'socket.io-client';
import { getToken } from './api';

describe('socketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    socketService.disconnect();
  });

  describe('connect auth', () => {
    it('should pass token in auth handshake', () => {
      socketService.connect();
      expect(getToken).toHaveBeenCalled();
      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ auth: { token: 'test-token' } })
      );
    });

    it('should not connect when token is missing', () => {
      (getToken as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);
      socketService.connect();
      expect(io).not.toHaveBeenCalled();
    });
  });

  describe('event listeners', () => {
    it('should have onForceLogout method', () => {
      expect(typeof socketService.onForceLogout).toBe('function');
    });

    it('should have onLoginRequired method', () => {
      expect(typeof socketService.onLoginRequired).toBe('function');
    });

    it('should have onScoreUpdate and onLeaderboard methods', () => {
      expect(typeof socketService.onScoreUpdate).toBe('function');
      expect(typeof socketService.onLeaderboard).toBe('function');
    });

    it('should have setName method', () => {
      expect(typeof socketService.setName).toBe('function');
    });
  });

  describe('getUser', () => {
    it('should return null before receiving init', () => {
      expect(socketService.getUser()).toBeNull();
    });
  });
});