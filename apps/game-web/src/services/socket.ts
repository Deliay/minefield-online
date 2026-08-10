import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

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

export interface User {
  username: string;
  displayName: string;
  score: number;
}

export interface InitEvent {
  sessionId: string;
  user: User;
  revealed: RevealedCell[];
  flagged: Array<{ col: number; row: number }>;
}

export interface ScoreUpdateEvent {
  sessionId: string;
  score: number;
}

export interface ForceLogoutEvent {
  reason: 'kicked';
}

export interface Ranking {
  username: string;
  displayName: string;
  score: number;
  isCurrentPlayer: boolean;
}

export interface LeaderboardEvent {
  rankings: Ranking[];
}

interface Listeners {
  onInit?: (data: InitEvent) => void;
  onCellRevealed?: (data: CellRevealedEvent) => void;
  onCellFlagged?: (data: CellFlaggedEvent) => void;
  onScoreUpdate?: (data: ScoreUpdateEvent) => void;
  onLeaderboard?: (data: LeaderboardEvent) => void;
  onForceLogout?: (data: ForceLogoutEvent) => void;
  onDisconnect?: () => void;
  onLoginRequired?: () => void;
}

class SocketService {
  private socket: Socket | null = null;
  private user: User | null = null;
  private listeners: Listeners = {};

  getUser(): User | null {
    return this.user;
  }

  connect() {
    if (this.socket?.connected) return;

    const token = getToken();
    if (!token) {
      this.listeners.onDisconnect?.();
      return;
    }

    this.socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.listeners.onDisconnect?.();
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Socket connect_error:', err.message);
      this.socket?.disconnect();
      this.listeners.onLoginRequired?.();
      this.listeners.onDisconnect?.();
    });

    this.socket.on('init', (data: InitEvent) => {
      this.user = data.user;
      this.listeners.onInit?.(data);
    });

    this.socket.on('cellRevealed', (data: CellRevealedEvent) => {
      this.listeners.onCellRevealed?.(data);
    });

    this.socket.on('cellFlagged', (data: CellFlaggedEvent) => {
      this.listeners.onCellFlagged?.(data);
    });

    this.socket.on('scoreUpdate', (data: ScoreUpdateEvent) => {
      if (this.user) this.user.score = data.score;
      this.listeners.onScoreUpdate?.(data);
    });

    this.socket.on('setNameSuccess', (data: { displayName: string }) => {
      if (this.user) this.user.displayName = data.displayName;
    });

    this.socket.on('leaderboard', (data: LeaderboardEvent) => {
      this.listeners.onLeaderboard?.(data);
    });

    this.socket.on('forceLogout', (data: ForceLogoutEvent) => {
      this.listeners.onForceLogout?.(data);
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

  onForceLogout(callback: (data: ForceLogoutEvent) => void) {
    this.listeners.onForceLogout = callback;
  }

  onDisconnect(callback: () => void) {
    this.listeners.onDisconnect = callback;
  }

  onLoginRequired(callback: () => void) {
    this.listeners.onLoginRequired = callback;
  }

  setName(name: string) {
    this.socket?.emit('setName', { name });
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
