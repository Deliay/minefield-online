# WebSocket Contract - Minefield Online

## Connection

- Endpoint: `ws://localhost:3001`
- Transport: WebSocket (Socket.IO with polling fallback)

## Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `reveal` | `{ col: number, row: number }` | Reveal cell at position (score: -100 if mine) |
| `flag` | `{ col: number, row: number }` | Flag cell as suspected mine (score: +10 if correct mine, -20 if actually not a mine) |
| `reset` | - | Reset game state for all clients |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `init` | `InitEvent` | Initial state on connection |
| `scoreUpdate` | `ScoreUpdateEvent` | Player score changed |
| `leaderboard` | `LeaderboardEvent` | Leaderboard data (sent after every score change) |
| `cellRevealed` | `CellRevealedEvent` | Cell reveal result |
| `cellFlagged` | `CellFlaggedEvent` | Flag toggle result |
| `reset` | - | Game has been reset |

## Data Types

```typescript
interface RevealedCell {
  col: number;
  row: number;
  isMine: boolean;
  number: number;
}

interface InitEvent {
  sessionId: string;
  revealed: RevealedCell[];
  flagged: Array<{ col: number; row: number }>;
}

interface ScoreUpdateEvent {
  sessionId: string;
  score: number;
}

interface Ranking {
  sessionId: string;
  score: number;
  isCurrentPlayer: boolean;
}

interface LeaderboardEvent {
  rankings: Ranking[];
}

interface CellRevealedEvent {
  col: number;
  row: number;
  cells: RevealedCell[];
}

interface CellFlaggedEvent {
  col: number;
  row: number;
  isFlagged: boolean;
}
```

## Board Configuration

```typescript
const CELL_SIZE = 40;
const COLS = 1200;
const ROWS = 640;
const CHUNK_COLS = 30;
const CHUNK_ROWS = 16;
const CHUNK_MINES = 99;
```

## Scoring Rules

| Action | Score Change |
|--------|--------------|
| Left click (reveal mine) | -100 |
| Flag a mine (correct) | +10 |
| Flag a non-mine (wrong) | -20 |

- Score can be negative
- Tie-breaker: earlier creation time ranks higher

## Session Management

- Session is created automatically on WebSocket connection
- Session contains: `sessionId`, `socketId`, `score` (initial: 0), `createdAt`
- Session persists across page refreshes (stored in cookie)
- Session is NOT destroyed on disconnect (preserves score for returning users)
- Sessions are only cleared when server restarts
- Only first 6 characters of `sessionId` are displayed publicly

## Leaderboard Rules

- Sorted by score descending
- Ties broken by `createdAt` ascending (earlier first)
- Full leaderboard sent to all clients on every score change
- Current player entry is highlighted via `isCurrentPlayer: true`
- Displayed in top-right corner of game UI

## Behavior Notes

- `reveal`: If cell is already revealed or flagged, returns empty `cells` array
- `reveal`: On mine hit, only the mine cell is returned in `cells`
- `reveal`: On safe cell, uses flood-fill to expand and returns all revealed cells
- `flag`: If cell is a mine, flags it and player earns +10 points
- `flag`: If cell is NOT a mine, reveals it and player loses 20 points
- `flag`: Cannot flag already revealed cells
- All events are broadcast to all connected clients (global state)
- New clients receive full `init` state including all previously revealed/flagged cells
- After `init`, client receives `leaderboard` event with current rankings