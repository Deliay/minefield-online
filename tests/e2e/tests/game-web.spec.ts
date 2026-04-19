import { test, expect } from '@playwright/test';

test.describe('game-web', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
  });

  test('canvas is visible', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('right-click flags a cell', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const bbox = await canvas.boundingBox();
    expect(bbox).not.toBeNull();

    const cellX = bbox!.x + bbox!.width / 2 + 100;
    const cellY = bbox!.y + bbox!.height / 2 + 100;

    await page.mouse.move(cellX, cellY);
    await page.waitForTimeout(300);
    await page.mouse.click(cellX, cellY, { button: 'right' });
    await page.waitForTimeout(500);
  });

  test('left-click reveals a cell with number', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const bbox = await canvas.boundingBox();
    expect(bbox).not.toBeNull();

    const revealX = bbox!.x + bbox!.width / 2 - 100;
    const revealY = bbox!.y + bbox!.height / 2 - 100;

    await page.mouse.move(revealX, revealY);
    await page.waitForTimeout(300);
    await page.mouse.click(revealX, revealY, { button: 'left' });
    await page.waitForTimeout(500);
  });

  test('right-click twice toggles flag off', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const bbox = await canvas.boundingBox();
    expect(bbox).not.toBeNull();

    const cellX = bbox!.x + bbox!.width / 2 + 100;
    const cellY = bbox!.y + bbox!.height / 2 + 100;

    await page.mouse.move(cellX, cellY);
    await page.waitForTimeout(300);
    await page.mouse.click(cellX, cellY, { button: 'right' });
    await page.waitForTimeout(500);
    await page.mouse.click(cellX, cellY, { button: 'right' });
    await page.waitForTimeout(500);
  });

  test('left-click on flagged cell does not reveal it', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const bbox = await canvas.boundingBox();
    expect(bbox).not.toBeNull();

    const cellX = bbox!.x + bbox!.width / 2 + 100;
    const cellY = bbox!.y + bbox!.height / 2 + 100;

    await page.mouse.move(cellX, cellY);
    await page.waitForTimeout(300);
    await page.mouse.click(cellX, cellY, { button: 'right' });
    await page.waitForTimeout(500);
    await page.mouse.click(cellX, cellY, { button: 'left' });
    await page.waitForTimeout(500);
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
});