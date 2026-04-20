import { test, expect } from '@playwright/test';

test.describe('game-web sequential click', () => {
  test('click all visible cells then refresh and repeat', async ({ page }) => {
    test.setTimeout(180000);

    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    let canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    let bbox = await canvas.boundingBox();
    expect(bbox).not.toBeNull();

    const cellSize = 40;
    const viewportCols = Math.floor(bbox!.width / cellSize);
    const viewportRows = Math.floor(bbox!.height / cellSize);

    console.log('Viewport:', viewportCols, 'x', viewportRows, 'cells');

    let clickCount = 0;

    for (let col = 0; col < viewportCols; col++) {
      for (let row = 0; row < viewportRows; row++) {
        const cellX = bbox!.x + col * cellSize + cellSize / 2;
        const cellY = bbox!.y + row * cellSize + cellSize / 2;

        await page.mouse.click(cellX, cellY);
        await page.waitForTimeout(30);
        clickCount++;
      }
    }

    console.log('First round: clicked', clickCount, 'cells');

    await page.reload();
    await page.waitForTimeout(5000);

    canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
    bbox = await canvas.boundingBox();
    expect(bbox).not.toBeNull();
    console.log('Page reloaded, canvas visible');

    clickCount = 0;
    for (let col = 0; col < viewportCols; col++) {
      for (let row = 0; row < viewportRows; row++) {
        const cellX = bbox!.x + col * cellSize + cellSize / 2;
        const cellY = bbox!.y + row * cellSize + cellSize / 2;

        await page.mouse.click(cellX, cellY);
        await page.waitForTimeout(30);
        clickCount++;
      }
    }

    console.log('Second round: clicked', clickCount, 'cells');

    if (consoleErrors.length > 0) {
      console.log('Console errors found:');
      for (const err of consoleErrors) {
        console.log(' -', err);
      }
    }

    expect(consoleErrors.length).toBe(0);
  });
});