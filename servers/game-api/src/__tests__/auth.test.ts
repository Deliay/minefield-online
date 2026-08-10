import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthManager, AuthError, isValidUsername } from '../auth.js';

vi.mock('bcryptjs', () => {
  const impl = {
    hash: vi.fn(async () => 'hashed'),
    compare: vi.fn(async () => true),
  };
  return {
    default: impl,
    ...impl,
  };
});

const state = vi.hoisted(() => {
  const collationImpl = vi.fn((): Promise<unknown> => Promise.resolve(null));
  return {
    findOne: vi.fn((_args?: unknown) => ({ collation: collationImpl })),
    setFindResult: (v: unknown) => collationImpl.mockResolvedValue(v),
  };
});

vi.mock('../db.js', () => ({
  User: {
    findOne: (args: unknown) => state.findOne(args),
    create: vi.fn(async (doc: Record<string, unknown>) => ({ _id: 'id', ...doc })),
  },
}));
void state; // keep reference for factory

import bcrypt from 'bcryptjs';

function makeAuth() {
  return new AuthManager();
}

describe('AuthManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.setFindResult(null);
  });

  describe('isValidUsername', () => {
    it('should accept 3-20 alphanumeric/underscore usernames', () => {
      expect(isValidUsername('abc')).toBe(true);
      expect(isValidUsername('alice_123')).toBe(true);
      expect(isValidUsername('a'.repeat(20))).toBe(true);
    });

    it('should reject too short, too long, or invalid characters', () => {
      expect(isValidUsername('ab')).toBe(false);
      expect(isValidUsername('a'.repeat(21))).toBe(false);
      expect(isValidUsername('bob-simon')).toBe(false);
      expect(isValidUsername('ha space')).toBe(false);
    });
  });

  describe('register', () => {
    it('should reject invalid username with 400', async () => {
      const auth = makeAuth();
      await expect(auth.register('ab', 'secret1')).rejects.toBeInstanceOf(AuthError);
      await expect(auth.register('ab', 'secret1')).rejects.toMatchObject({ status: 400 });
    });

    it('should reject short password with 400', async () => {
      const auth = makeAuth();
      await expect(auth.register('alice', '123')).rejects.toMatchObject({ status: 400 });
    });

    it('should reject duplicate username with 409 (case-insensitive)', async () => {
      state.setFindResult({ username: 'Alice', displayName: 'Alice', score: 0 });
      const auth = makeAuth();
      await expect(auth.register('alice', 'secret1')).rejects.toMatchObject({ status: 409, message: '用户名已被占用' });
    });

    it('should create user and issue a single token on success', async () => {
      state.setFindResult(null);
      const auth = makeAuth();
      const result = await auth.register('alice', 'secret1');
      expect(result.token).toBeDefined();
      expect(result.token.length).toBe(64);
      expect(result.user.username).toBe('alice');
      expect(result.user.displayName).toBe('alice');
      expect(result.user.score).toBe(0);
      expect(auth.getUserByToken(result.token)).toBe('alice');
    });
  });

  describe('login', () => {
    it('should reject non-existent or wrong-password user with a unified 401', async () => {
      const auth = makeAuth();
      await expect(auth.login('nobody', 'secret1')).rejects.toMatchObject({ status: 401 });
    });

    it('should return previous socket id when account has an active session and rotate token', async () => {
      state.setFindResult({ username: 'alice', displayName: 'alice', score: 5, passwordHash: 'h' });
      const auth = makeAuth();
      const first = await auth.login('alice', 'secret1');
      auth.bindSocket('alice', 'socket-old');
      expect(auth.getActiveSocketId('alice')).toBe('socket-old');

      const second = await auth.login('alice', 'secret1');
      expect(second.previousSocketId).toBe('socket-old');
      expect(second.token).not.toBe(first.token);
      expect(auth.getUserByToken(first.token)).toBeUndefined();
      expect(auth.getUserByToken(second.token)).toBe('alice');
    });
  });

  describe('logout & token revoke', () => {
    it('should revoke token on logout', async () => {
      state.setFindResult({ username: 'alice', displayName: 'alice', score: 0, passwordHash: 'h' });
      const auth = makeAuth();
      const r = await auth.login('alice', 'secret1');
      expect(auth.logout(r.token)).toBe(true);
      expect(auth.getUserByToken(r.token)).toBeUndefined();
    });

    it('should return false for missing or invalid token', () => {
      const auth = makeAuth();
      expect(auth.logout()).toBe(false);
      expect(auth.logout('bogus')).toBe(false);
    });

    it('should only keep one active session per account (kick state machine)', async () => {
      state.setFindResult({ username: 'bob', displayName: 'bob', score: 0, passwordHash: 'h' });
      const auth = makeAuth();
      await auth.login('bob', 'secret1');
      auth.bindSocket('bob', 's1');
      await auth.login('bob', 'secret1');
      auth.bindSocket('bob', 's2');
      expect(auth.getActiveSocketId('bob')).toBe('s2');
    });
  });

  describe('bcrypt', () => {
    it('should hash passwords via bcrypt hash strength', async () => {
      const auth = makeAuth();
      state.setFindResult(null);
      await auth.register('carol', 'secret1');
      expect(bcrypt.hash).toHaveBeenCalledWith('secret1', 10);
    });
  });
});