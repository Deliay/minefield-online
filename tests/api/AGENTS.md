# API Tests

## Tech Stack

- Vitest as test runner
- socket.io-client for WebSocket API testing

## Project Structure

```
tests/api/
├── package.json
├── vitest.config.ts
├── src/
│   └── game-api/
│       └── game-api.spec.ts
└── AGENTS.md
```

## Running Tests

### 1. Start Services with Aspire

From `infra/local-dev` directory:

```bash
cd infra/local-dev
aspire start
```

### 2. Get API URL

```bash
aspire describe game-api
```

### 3. Run API Tests

Set the `E2E_API_URL` environment variable and run tests:

```bash
E2E_API_URL=http://localhost:xxxxx npm test
```

## Test Coverage

- WebSocket connection and init event
- reveal API with response time < 20ms
- flag API and toggle behavior
- State synchronization for new clients