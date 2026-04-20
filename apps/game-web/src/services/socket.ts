import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface RevealedCell {
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
  revealed: Array<{ col: number; row: number; cell: RevealedCell }>;
  flagged: Array<{ col: number; row: number }>;
}

class SocketService {
  private socket: Socket | null = null;
  private listeners: {
    onInit?: (data: InitEvent) => void;
    onCellRevealed?: (data: CellRevealedEvent) => void;
    onCellFlagged?: (data: CellFlaggedEvent) => void;
  } = {};

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
      this.listeners.onInit?.(data);
    });

    this.socket.on('cellRevealed', (data: CellRevealedEvent) => {
      this.listeners.onCellRevealed?.(data);
    });

    this.socket.on('cellFlagged', (data: CellFlaggedEvent) => {
      this.listeners.onCellFlagged?.(data);
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

  reveal(col: number, row: number) {
    this.socket?.emit('reveal', { col, row });
  }

  flag(col: number, row: number) {
    this.socket?.emit('flag', { col, row });
  }
}

export const socketService = new SocketService();