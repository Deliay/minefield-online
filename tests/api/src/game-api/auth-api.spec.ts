import { describe, it, expect, beforeAll } from 'vitest';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

interface User {
  username: string;
  displayName: string;
  score: number;
}

interface AuthResponse {
  token: string;
  user: User;
}

function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}`;
}

async function postAuth(path: string, body: unknown): Promise<Response & { json: () => Promise<unknown> }> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

function waitForEvent<T>(socket: Socket, event: string, timeout = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function waitForConnect(socket: Socket, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.connected) return resolve();
    const timer = setTimeout(() => reject(new Error('Connection timeout')), timeout);
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

describe('Auth REST API', () => {
  let username: string;
  const password = 'secret1';

  beforeAll(() => {
    username = uniqueName('alice');
  });

  it('should register a new user and auto-login', async () => {
    const res = await postAuth('/api/auth/register', { username, password });
    expect(res.status).toBe(200);
    const body = (await res.json()) as AuthResponse;
    expect(body.token).toBeDefined();
    expect(body.user.username).toBe(username);
    expect(body.user.displayName).toBe(username);
    expect(body.user.score).toBe(0);
  });

  it('should reject duplicate username with 409', async () => {
    const res = await postAuth('/api/auth/register', { username, password });
    const body = (await res.json()) as { error: string };
    expect(res.status).toBe(409);
    expect(body.error).toBe('用户名已被占用');
  });

  it('should return unified 401 for wrong credentials on login', async () => {
    const res = await postAuth('/api/auth/login', { username, password: 'wrongpassword' });
    const body = (await res.json()) as { error: string };
    expect(res.status).toBe(401);
    expect(body.error).toBe('用户名或密码错误');
  });

  it('should login successfully and return token + persisted score', async () => {
    const res = await postAuth('/api/auth/login', { username, password });
    expect(res.status).toBe(200);
    const body = (await res.json()) as AuthResponse;
    expect(body.token).toBeDefined();
    expect(body.user.username).toBe(username);
  });

  it('should logout with valid token and 204', async () => {
    const loginRes = await postAuth('/api/auth/login', { username, password });
    const login = (await loginRes.json()) as AuthResponse;
    const res = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${login.token}` },
    });
    expect(res.status).toBe(204);
  });

  it('should reject logout without valid token with 401', async () => {
    const res = await fetch(`${API_URL}/api/auth/logout`, { method: 'POST' });
    expect(res.status).toBe(401);
  });
});

describe('WS auth & single-session kick', () => {
  let username: string;
  const password = 'secret1';

  beforeAll(async () => {
    username = uniqueName('bob');
    const res = await postAuth('/api/auth/register', { username, password });
    expect(res.status).toBe(200);
  });

  it('should reject connection without token', async () => {
    const socket = io(API_URL, { transports: ['websocket', 'polling'], reconnection: false });
    await expect(waitForConnect(socket)).rejects.toThrow();
    socket.disconnect();
  });

  it('should reject connection with invalid token', async () => {
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: false,
      auth: { token: 'bogus-token' },
    });
    await expect(waitForConnect(socket)).rejects.toThrow();
    socket.disconnect();
  });

  it('should connect with valid token and receive init with user', async () => {
    const loginRes = await postAuth('/api/auth/login', { username, password });
    const login = (await loginRes.json()) as AuthResponse;

    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: false,
      auth: { token: login.token },
    });
    await waitForConnect(socket);
    const init = await waitForEvent<{ sessionId: string; user: User }>(socket, 'init');
    expect(init.user.username).toBe(username);
    expect(init.user.displayName).toBeDefined();
    socket.disconnect();
  });

  it('should kick old session when same account logs in elsewhere (forceLogout)', async () => {
    const firstLogin = (await (await postAuth('/api/auth/login', { username, password })).json()) as AuthResponse;
    const old = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: false,
      auth: { token: firstLogin.token },
    });
    await waitForConnect(old);
    await waitForEvent(old, 'init');

    const secondLogin = (await (await postAuth('/api/auth/login', { username, password })).json()) as AuthResponse;
    const kick = await waitForEvent<{ reason: string }>(old, 'forceLogout');
    expect(kick.reason).toBe('kicked');
    expect(secondLogin.token).not.toBe(firstLogin.token);
    old.disconnect();
  });
});

describe('Score persistence', () => {
  it('should persist score and restore it on next login', async () => {
    const username = uniqueName('carol');
    const registerRes = await postAuth('/api/auth/register', { username, password: 'secret1' });
    const registered = (await registerRes.json()) as AuthResponse;

    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: false,
      auth: { token: registered.token },
    });
    await waitForConnect(socket);
    await waitForEvent(socket, 'init');

    socket.emit('flag', { col: 10, row: 10 });
    await waitForEvent(socket, 'cellFlagged');
    const scoreUpdate = await waitForEvent<{ sessionId: string; score: number }>(socket, 'scoreUpdate');
    expect(scoreUpdate.score).toBe(10);
    socket.disconnect();

    const loginRes = await postAuth('/api/auth/login', { username, password: 'secret1' });
    const login = (await loginRes.json()) as AuthResponse;
    expect(login.user.score).toBe(10);
  });
});