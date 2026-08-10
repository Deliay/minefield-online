const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'minefield_token';

export interface User {
  username: string;
  displayName: string;
  score: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error ?? '请求失败';
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return body as T;
}

export async function register(
  username: string,
  password: string
): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<void> {
  const token = getToken();
  if (!token) return;
  try {
    await request<void>('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } finally {
    clearToken();
  }
}

export const authApi = { register, login, logout, getToken, setToken, clearToken };