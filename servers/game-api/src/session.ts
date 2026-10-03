import { User } from './db.js';

export interface Session {
  username: string;
  displayName: string;
  socketId: string;
  score: number;
  createdAt: number;
  nfMode: boolean;
  nfSettled: number;
}

export interface Ranking {
  username: string;
  displayName: string;
  score: number;
  isCurrentPlayer: boolean;
  nfMode: boolean;
  nfSettled: number;
}

const sessions = new Map<string, Session>();

export function createSession(
  username: string,
  displayName: string,
  socketId: string,
  score: number
): Session {
  const session: Session = {
    username,
    displayName,
    socketId,
    score,
    createdAt: Date.now(),
    nfMode: false,
    nfSettled: 0,
  };
  sessions.set(socketId, session);
  return session;
}

export function getSession(socketId: string): Session | undefined {
  return sessions.get(socketId);
}

export function deleteSession(socketId: string): void {
  sessions.delete(socketId);
}

export async function updateScore(
  socketId: string,
  delta: number
): Promise<Session | null> {
  const session = sessions.get(socketId);
  if (!session) return null;

  const updated = await User.findOneAndUpdate(
    { username: session.username },
    { $inc: { score: delta } },
    { new: true }
  ).collation({ locale: 'en', strength: 2 });

  if (!updated) {
    console.warn(`[score] 写库失败，跳过广播: username=${session.username}`);
    return null;
  }
  session.score = updated.score;
  session.displayName = updated.displayName;
  return session;
}

export async function updateDisplayName(
  socketId: string,
  name: string
): Promise<Session | null> {
  const session = sessions.get(socketId);
  if (!session) return null;

  const updated = await User.findOneAndUpdate(
    { username: session.username },
    { $set: { displayName: name } },
    { new: true }
  ).collation({ locale: 'en', strength: 2 });

  if (!updated) {
    console.warn(`[setName] 写库失败: username=${session.username}`);
    return null;
  }
  session.displayName = updated.displayName;
  return session;
}

export function getLeaderboard(currentSocketId?: string): Ranking[] {
  const allSessions = Array.from(sessions.values());
  const sorted = allSessions.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.createdAt - b.createdAt;
  });
  return sorted.map((s) => ({
    username: s.username,
    displayName: s.displayName,
    score: s.score,
    isCurrentPlayer: s.socketId === currentSocketId,
    nfMode: s.nfMode,
    nfSettled: s.nfSettled,
  }));
}