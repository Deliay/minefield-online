# WebSocket Contract - Minefield Online

## Connection

- Endpoint: `ws://localhost:3001`
- Transport: WebSocket (Socket.IO with polling fallback)
- Authentication: client MUST pass a valid token in the `auth` handshake field (`{ token: string }`). Missing or invalid token → connection is rejected (`disconnect`). **本期强制登录，无游客模式。**

## Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `reveal` | `{ col: number, row: number }` | Reveal cell at position (score: -100 if mine) |
| `flag` | `{ col: number, row: number }` | Flag cell as suspected mine (score: +10 if correct mine, -20 if actually not a mine) |
| `chord` | `{ col: number, row: number }` | Auto-reveal neighbors of a revealed number cell (score: -100 if mine hit) |
| `setName` | `{ name: string }` | 持久化修改显示名称（max 20 字符），成功后广播 leaderboard |
| `reset` | - | Reset game state for all clients |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `init` | `InitEvent` | Initial state on connection |
| `scoreUpdate` | `ScoreUpdateEvent` | Player score changed |
| `leaderboard` | `LeaderboardEvent` | Leaderboard data (sent after every score change) |
| `cellRevealed` | `CellRevealedEvent` | Cell reveal result |
| `cellFlagged` | `CellFlaggedEvent` | Flag toggle result |
| `setNameSuccess` | `{ displayName: string }` | Display name updated successfully |
| `setNameError` | `{ error: string }` | Display name rejected |
| `forceLogout` | `ForceLogoutEvent` | 账号在他处登录，本会话被踢出（客户端应清除 token 并返回登录界面） |
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
  user: {
    username: string;
    displayName: string;
    score: number;
  };
  revealed: RevealedCell[];
  flagged: Array<{ col: number; row: number }>;
}

interface ScoreUpdateEvent {
  sessionId: string;
  score: number;
}

interface ForceLogoutEvent {
  reason: 'kicked';
}

interface Ranking {
  username: string;
  displayName: string;
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
| Flag a non-mine (wrong) | -20 (cell is revealed) |
| Chord that reveals a mine | -100 |

- Score can be negative
- Tie-breaker: earlier creation time ranks higher

## Session Management

- Session is created automatically on authenticated WebSocket connection (token → user)
- Session binds to a user account (`username`/`displayName`), score is persisted to MongoDB
- Session contains: `username`, `displayName`, `socketId`, `score`, `createdAt`
- Session is destroyed on disconnect
- 同一账号同一时间仅允许一个活跃会话：新会话登录后旧会话收到 `forceLogout` 并被断开

## Leaderboard Rules

- Sorted by score descending
- Ties broken by `createdAt` ascending (earlier first)
- Full leaderboard sent to all clients on every score change
- Current player entry is highlighted via `isCurrentPlayer: true`
- Displayed in top-right corner of game UI
- Ranking identity uses `displayName`（持久化，默认 = username）；用户名大小写不敏感唯一

## Behavior Notes

- `reveal`: If cell is already revealed or flagged, returns empty `cells` array
- `reveal`: On mine hit, only the mine cell is returned in `cells`
- `reveal`: On safe cell, uses flood-fill to expand and returns all revealed cells
- `flag`: If cell is a mine, flags it and player earns +10 points
- `flag`: If cell is NOT a mine, reveals it and player loses 20 points
- `flag`: Cannot flag already revealed cells
- `chord`: Only valid on a revealed number cell; reveals un-revealed neighbors when the flagged count matches the number
- All events are broadcast to all connected clients (global state)
- New clients receive full `init` state including all previously revealed/flagged cells
- After `init`, client receives `leaderboard` event with current rankings
