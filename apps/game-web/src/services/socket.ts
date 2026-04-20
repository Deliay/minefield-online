import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

    this.socket = io(API_URL, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('init', (data: InitEvent) => {
      this.sessionId = data.sessionId;
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

  flag(col: number, row: number) {
    this.socket?.emit('flag', { col, row });
  }
}

export const socketService = new SocketService();