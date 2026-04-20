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

const sessions = new Map<string, Session>();

export function createSession(socketId: string): Session {
  const sessionId = crypto.randomUUID();
  const session: Session = {
    sessionId,
    socketId,
    score: 0,
    createdAt: Date.now(),
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

export function updateScore(socketId: string, delta: number): Session | undefined {
  const session = sessions.get(socketId);
  if (!session) return undefined;
  session.score += delta;
  return session;
}

export function getLeaderboard(currentSocketId?: string): Ranking[] {
  const allSessions = Array.from(sessions.values());
  const sorted = allSessions.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.createdAt - b.createdAt;
  });
  return sorted.map(s => ({
    sessionId: s.sessionId.slice(0, 6),
    score: s.score,
    isCurrentPlayer: s.socketId === currentSocketId,
  }));
}