export interface Session {
  sessionId: string;
  socketId: string;
  score: number;
  createdAt: number;
}

export interface Ranking {
  sessionId: string;
  score: number;
  isCurrentPlayer: boolean;
}

export const sessions = new Map<string, Session>();

export function createSession(socketId: string, existingSessionId?: string): Session {
  const sessionId = existingSessionId || crypto.randomUUID();
  const existing = existingSessionId ? sessions.get(existingSessionId) : undefined;
  const session: Session = {
    sessionId,
    socketId,
    score: existing?.score ?? 0,
    createdAt: existing?.createdAt ?? Date.now(),
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function getSessionBySessionId(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function updateScore(sessionId: string, delta: number): Session | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  session.score += delta;
  return session;
}

export function getLeaderboard(currentSessionId?: string): Ranking[] {
  const allSessions = Array.from(sessions.values());
  const sorted = allSessions.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.createdAt - b.createdAt;
  });
  return sorted.map(s => ({
    sessionId: s.sessionId.slice(0, 6),
    score: s.score,
    isCurrentPlayer: s.sessionId === currentSessionId,
  }));
}