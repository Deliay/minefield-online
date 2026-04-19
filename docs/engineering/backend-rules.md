# Backend Engineering Rules

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js with TypeScript
- **WebSocket**: Socket.IO
- **Language**: TypeScript
- **Execution**: tsx for development

## Project Structure

```
servers/game-api/
├── src/
│   ├── index.ts        # Entry point
│   ├── game/           # Game logic
│   └── types/          # Shared types
├── package.json
└── tsconfig.json
```

## Commands

```bash
npm install
npm run dev      # Development with watch
npm run build    # Compile TypeScript
npm start        # Production
```

## WebSocket Events

### Server → Client
- `room:created` - Room created successfully
- `room:joined` - Player joined room
- `game:state` - Game state update
- `game:over` - Game ended

### Client → Server
- `room:create` - Create new room
- `room:join` - Join existing room
- `player:action` - Player click/action