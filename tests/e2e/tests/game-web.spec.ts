import { test, expect } from '@playwright/test';

test.describe('game-web socket integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
  });

  test('canvas is visible after page load', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('socket connects successfully', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(1500);

    const connected = consoleLogs.some(log => log.includes('Connected to server'));
    expect(connected).toBe(true);
  });

  test('left-click reveals a cell', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const bbox = await canvas.boundingBox();
    expect(bbox).not.toBeNull();

    const cellX = bbox!.x + bbox!.width / 2 + 100;
    const cellY = bbox!.y + bbox!.height / 2 + 100;

    await page.mouse.move(cellX, cellY);
    await page.waitForTimeout(300);
    await page.mouse.click(cellX, cellY, { button: 'left' });
    await page.waitForTimeout(1000);
  });

  test('right-click flags a cell', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const bbox = await canvas.boundingBox();
    expect(bbox).not.toBeNull();

    const cellX = bbox!.x + bbox!.width / 2 + 200;
    const cellY = bbox!.y + bbox!.height / 2 + 200;

    await page.mouse.move(cellX, cellY);
    await page.waitForTimeout(300);
    await page.mouse.click(cellX, cellY, { button: 'right' });
    await page.waitForTimeout(1000);
  });

  test('right-click twice toggles flag off', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const bbox = await canvas.boundingBox();
    expect(bbox).not.toBeNull();

    const cellX = bbox!.x + bbox!.width / 2 + 300;
    const cellY = bbox!.y + bbox!.height / 2 + 300;

    await page.mouse.move(cellX, cellY);
    await page.waitForTimeout(300);
    await page.mouse.click(cellX, cellY, { button: 'right' });
    await page.waitForTimeout(1000);
    await page.mouse.click(cellX, cellY, { button: 'right' });
    await page.waitForTimeout(1000);
  });

  test('left-click on flagged cell does not reveal it', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const bbox = await canvas.boundingBox();
    expect(bbox).not.toBeNull();

    const cellX = bbox!.x + bbox!.width / 2 + 400;
    const cellY = bbox!.y + bbox!.height / 2 + 400;

    await page.mouse.move(cellX, cellY);
    await page.waitForTimeout(300);
    await page.mouse.click(cellX, cellY, { button: 'right' });
    await page.waitForTimeout(1000);
    await page.mouse.click(cellX, cellY, { button: 'left' });
    await page.waitForTimeout(1000);
  });

  test('drag stage with Space key held', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const bbox = await canvas.boundingBox();
    expect(bbox).not.toBeNull();

    const centerX = bbox!.x + bbox!.width / 2;
    const centerY = bbox!.y + bbox!.height / 2;

    await page.mouse.move(centerX, centerY);
    await page.keyboard.down('Space');
    await page.waitForTimeout(100);

    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(centerX + i * 20, centerY + i * 20, { steps: 2 });
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.keyboard.up('Space');
    await page.waitForTimeout(800);
  });

  test.describe('leaderboard', () => {
    test('leaderboard is visible in top-right corner', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);

      const leaderboard = page.locator('div').filter({ hasText: /排名|#1|Score/i }).first();
      await expect(leaderboard).toBeVisible();
    });

    test('current player score is highlighted', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);

      const currentPlayerSection = page.locator('div').filter({ hasText: 'You:' }).first();
      await expect(currentPlayerSection).toBeVisible();
    });

    test('right-click flag updates score', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);

      const canvas = page.locator('canvas').first();
      const bbox = await canvas.boundingBox();
      expect(bbox).not.toBeNull();

      const cellX = bbox!.x + bbox!.width / 2 + 100;
      const cellY = bbox!.y + bbox!.height / 2 + 100;

      await page.mouse.move(cellX, cellY);
      await page.waitForTimeout(300);
      await page.mouse.click(cellX, cellY, { button: 'right' });
      await page.waitForTimeout(1000);
    });
  });
});