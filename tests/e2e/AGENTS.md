# E2E Tests

## Tech Stack

- Playwright for browser-based e2e testing
- Aspire for service orchestration

## Project Structure

```
tests/e2e/
├── package.json
├── playwright.config.ts
├── tests/
│   └── game-web.spec.ts    # game-web e2e tests
└── AGENTS.md
```

## Running Tests

### 1. Start Services with Aspire

From `infra/local-dev` directory:

```bash
cd infra/local-dev
aspire start
```

### 2. Get Web URL

```bash
aspire describe game-web
```

The web URL will be shown in the output (typically `http://localhost:5173`).

### 3. Run E2E Tests

Set the `E2E_WEB_URL` environment variable and run tests:

```bash
E2E_WEB_URL=http://localhost:5173 npx playwright test
```

Or use a `.env` file:

```bash
cp .env.example .env
# Edit .env with correct URL
npx playwright test
```

## Environment Variables

- `E2E_WEB_URL` - Base URL for the web application under test

## Test Files

- `tests/game-web.spec.ts` - Tests for the game-web application (cell reveal, flag, drag)

## Test Conventions

- Use Playwright test runner with `test` and `expect`
- Group related tests with `describe` blocks
- Use `page.locator('canvas')` to interact with Konva canvas
- Clean up state between tests if needed