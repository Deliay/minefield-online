# Frontend Engineering Rules

## Tech Stack

- **Framework**: React 18+ with Vite
- **Language**: TypeScript
- **State Management**: React Context / useState
- **WebSocket**: socket.io-client

## Project Structure

```
apps/game-web/
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   ├── services/       # API and WebSocket services
│   ├── types/          # TypeScript types
│   └── App.tsx
├── index.html
└── package.json
```

## Commands

```bash
npm install
npm run dev      # Development server
npm run build   # Production build
```

## Naming Conventions

- Components: PascalCase (`GameBoard.tsx`)
- Hooks: camelCase with `use` prefix (`useGameState.ts`)
- Services: camelCase (`socketService.ts`)