import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, IUser } from './db.js';

export class AuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface UserProfile {
  username: string;
  displayName: string;
  score: number;
}

export interface LoginResult {
  token: string;
  user: UserProfile;
  previousSocketId?: string;
}

export function isValidUsername(username: string): boolean {
  return /^[A-Za-z0-9_]{3,20}$/.test(username);
}

const keyOf = (username: string) => username.toLowerCase();

export class AuthManager {
  /** token -> original-case username */
  private tokens = new Map<string, string>();
  /** lowercase username -> socketId */
  private activeSessions = new Map<string, string>();

  async register(username: string, password: string): Promise<LoginResult> {
    if (!isValidUsername(username)) {
      throw new AuthError(400, '用户名需为 3-20 位字母、数字或下划线');
    }
    if (!password || password.length < 6) {
      throw new AuthError(400, '密码至少 6 位');
    }
    const existing = await User.findOne({ username }).collation({ locale: 'en', strength: 2 });
    if (existing) {
      throw new AuthError(409, '用户名已被占用');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      displayName: username,
      passwordHash,
      score: 0,
    });
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(token, user.username);
    return { token, user: this.toProfile(user) };
  }

  async login(username: string, password: string): Promise<LoginResult> {
    if (!isValidUsername(username)) {
      throw new AuthError(400, '用户名格式不正确');
    }
    if (!password) {
      throw new AuthError(400, '请输入密码');
    }
    const user = await User.findOne({ username }).collation({ locale: 'en', strength: 2 });
    if (!user) {
      throw new AuthError(401, '用户名或密码错误');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new AuthError(401, '用户名或密码错误');
    }
    const previousSocketId = this.activeSessions.get(keyOf(user.username));
    this.revokeUserTokens(user.username);
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(token, user.username);
    return { token, user: this.toProfile(user), previousSocketId };
  }

  logout(token?: string): boolean {
    if (!token) return false;
    const username = this.tokens.get(token);
    if (!username) return false;
    this.tokens.delete(token);
    return true;
  }

  revokeToken(token: string): void {
    this.tokens.delete(token);
  }

  private revokeUserTokens(username: string): void {
    for (const [token, u] of this.tokens) {
      if (u.toLowerCase() === username.toLowerCase()) {
        this.tokens.delete(token);
      }
    }
  }

  getUserByToken(token?: string): string | undefined {
    if (!token) return undefined;
    return this.tokens.get(token);
  }

  async findUserByUsername(username: string): Promise<IUser | null> {
    return User.findOne({ username }).collation({ locale: 'en', strength: 2 });
  }

  bindSocket(username: string, socketId: string): void {
    this.activeSessions.set(keyOf(username), socketId);
  }

  getActiveSocketId(username: string): string | undefined {
    return this.activeSessions.get(keyOf(username));
  }

  unbindSocket(username: string, socketId: string): void {
    if (this.activeSessions.get(keyOf(username)) === socketId) {
      this.activeSessions.delete(keyOf(username));
    }
  }

  toProfile(user: IUser): UserProfile {
    return { username: user.username, displayName: user.displayName, score: user.score };
  }
}

export const authManager = new AuthManager();