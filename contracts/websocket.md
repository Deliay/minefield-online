# WebSocket Contract - Multiplayer Minesweeper

## Connection

- Endpoint: `ws://localhost:3001`
- Transport: WebSocket (Socket.IO)

## Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `room:create` | `{ playerName: string }` | Create new game room |
| `room:join` | `{ roomId: string, playerName: string }` | Join existing room |
| `player:action` | `{ x: number, y: number }` | Player clicks cell |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room:created` | `{ roomId: string }` | Room created response |
| `room:joined` | `{ roomId: string, gameState: GameState }` | Player joined room |
| `error` | `{ message: string }` | Error occurred |
| `game:state` | `{ gameState: GameState }` | Game state updated |
| `game:over` | `{ winner: string, reason: string }` | Game ended |

## Data Types

```typescript
interface GameState {
  roomId: string;
  board: Cell[][];
  players: Player[];
  currentPlayer: string;
  status: 'waiting' | 'playing' | 'ended';
}

interface Cell {
  x: number;
  y: number;
  isMine: boolean;
  isRevealed: boolean;
  adjacentMines: number;
}

interface Player {
  id: string;
  name: string;
  score: number;
}
```