const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleLogs = [];
  const consoleErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    } else {
      consoleLogs.push(text);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  try {
    await page.goto('http://localhost:34325', { waitUntil: 'networkidle' });
    console.log('Page loaded successfully');

    await page.waitForTimeout(1000);

    const stage = await page.locator('canvas').first();
    if (await stage.isVisible()) {
      console.log('Canvas found and visible');
    } else {
      console.log('Canvas not found!');
      process.exit(1);
    }

    const bbox = await stage.boundingBox();
    console.log('Canvas bbox:', bbox);

    console.log('\n=== Step 1: Initial mouse position ===');
    let centerX = bbox.x + bbox.width / 2;
    let centerY = bbox.y + bbox.height / 2;
    await page.mouse.move(centerX, centerY);
    await page.waitForTimeout(300);
    console.log('Moved to:', centerX, centerY);

    console.log('\n=== Step 2: Drag stage with Space held ===');
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
    console.log('Drag completed');

    console.log('\n=== Step 3: Move mouse to NEW position after drag ===');
    const newX = bbox.x + 200;
    const newY = bbox.y + 200;
    await page.mouse.move(newX, newY);
    await page.waitForTimeout(500);
    console.log('Moved to:', newX, newY);

    console.log('\n=== Console Logs ===');
    for (const log of consoleLogs) {
      console.log(log);
    }

    if (consoleErrors.length > 0) {
      console.log('\n=== Console Errors ===');
      for (const err of consoleErrors) {
        console.log(err);
      }
    } else {
      console.log('\nNo console errors');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();