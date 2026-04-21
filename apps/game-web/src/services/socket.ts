import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SESSION_ID_COOKIE = 'minefield_session_id';

export interface RevealedCell {
  col: number;
  row: number;
  isMine: boolean;
  number: number;
}

export interface CellRevealedEvent {
  col: number;
  row: number;
  cells: RevealedCell[];
}

export interface CellFlaggedEvent {
  col: number;
  row: number;
  isFlagged: boolean;
}

export interface InitEvent {
  sessionId: string;
  revealed: RevealedCell[];
  flagged: Array<{ col: number; row: number }>;
}

export interface ScoreUpdateEvent {
  sessionId: string;
  score: number;
}

export interface Ranking {
  sessionId: string;
  score: number;
  isCurrentPlayer: boolean;
}

export interface LeaderboardEvent {
  rankings: Ranking[];
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function setCookie(name: string, value: string, days: number = 365): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/`;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

class SocketService {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private listeners: {
    onInit?: (data: InitEvent) => void;
    onCellRevealed?: (data: CellRevealedEvent) => void;
    onCellFlagged?: (data: CellFlaggedEvent) => void;
    onScoreUpdate?: (data: ScoreUpdateEvent) => void;
    onLeaderboard?: (data: LeaderboardEvent) => void;
  } = {};

  getSessionId(): string | null {
    return this.sessionId;
  }

  connect() {
    if (this.socket?.connected) return;

    const storedSessionId = getCookie(SESSION_ID_COOKIE);

    this.socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      auth: { sessionId: storedSessionId || undefined },
    });

    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('init', (data: InitEvent) => {
      this.sessionId = data.sessionId;
      if (data.sessionId !== storedSessionId) {
        setCookie(SESSION_ID_COOKIE, data.sessionId);
      }
      this.listeners.onInit?.(data);
    });

    this.socket.on('cellRevealed', (data: CellRevealedEvent) => {
      this.listeners.onCellRevealed?.(data);
    });

    this.socket.on('cellFlagged', (data: CellFlaggedEvent) => {
      this.listeners.onCellFlagged?.(data);
    });

    this.socket.on('scoreUpdate', (data: ScoreUpdateEvent) => {
      this.listeners.onScoreUpdate?.(data);
    });

    this.socket.on('leaderboard', (data: LeaderboardEvent) => {
      this.listeners.onLeaderboard?.(data);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  clearSession(): void {
    deleteCookie(SESSION_ID_COOKIE);
    this.sessionId = null;
  }

  onInit(callback: (data: InitEvent) => void) {
    this.listeners.onInit = callback;
  }

  onCellRevealed(callback: (data: CellRevealedEvent) => void) {
    this.listeners.onCellRevealed = callback;
  }

  onCellFlagged(callback: (data: CellFlaggedEvent) => void) {
    this.listeners.onCellFlagged = callback;
  }

  onScoreUpdate(callback: (data: ScoreUpdateEvent) => void) {
    this.listeners.onScoreUpdate = callback;
  }

  onLeaderboard(callback: (data: LeaderboardEvent) => void) {
    this.listeners.onLeaderboard = callback;
  }

  reveal(col: number, row: number) {
    this.socket?.emit('reveal', { col, row });
  }

  chord(col: number, row: number) {
    this.socket?.emit('chord', { col, row });
  }

  flag(col: number, row: number) {
    this.socket?.emit('flag', { col, row });
  }
}

export const socketService = new SocketService();