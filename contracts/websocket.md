# WebSocket Contract - Minefield Online

## Connection

- Endpoint: `ws://localhost:3001`
- Transport: WebSocket (Socket.IO with polling fallback)

## Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `reveal` | `{ col: number, row: number }` | Reveal cell at position |
| `flag` | `{ col: number, row: number }` | Toggle flag on cell |
| `reset` | - | Reset game state for all clients |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `init` | `InitEvent` | Initial state on connection |
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
  revealed: RevealedCell[];
  flagged: Array<{ col: number; row: number }>;
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

## Behavior Notes

- `reveal`: If cell is already revealed or flagged, returns empty `cells` array
- `reveal`: On mine hit, only the mine cell is returned in `cells`
- `reveal`: On safe cell, uses flood-fill to expand and returns all revealed cells
- `flag`: Toggles flag state; returns `isFlagged: true` if now flagged, `false` if unflagged
- `flag`: Cannot flag already revealed cells
- All events are broadcast to all connected clients (global state)
- New clients receive full `init` state including all previously revealed/flagged cells