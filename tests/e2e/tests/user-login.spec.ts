import { test, expect, type Page } from '@playwright/test';

async function register(page: Page, username: string) {
  await page.goto('/');
  await page.getByText('去注册').click();
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill('secret1');
  await page.getByLabel('确认密码').fill('secret1');
  await page.getByText('注册并登录').click();
  await page.waitForSelector('canvas');
}

test.describe('user login flow', () => {
  test('unauthenticated access redirects to login page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('登录')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('register logs in and shows the game with the current user', async ({ page }) => {
    const username = `player_${Date.now().toString(36)}`;
    await register(page, username);
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByText(name => name.includes(username))).toBeVisible();
  });

  test('user can rename display name via the input', async ({ page }) => {
    const username = `pname_${Date.now().toString(36)}`;
    await register(page, username);
    await page.getByLabel('改名').fill('Alice');
    await page.getByRole('button', { name: '改名' }).click();
    await expect(page.getByText('Alice（')).toBeVisible();
  });

  test('other session login kicks the old session with logout notice', async ({ page, context }) => {
    const username = `kick_${Date.now().toString(36)}`;

    const pageA = await context.newPage();
    await register(pageA, username);

    const pageB = await context.newPage();
    await register(pageB, username);

    await expect(pageA.getByText('账号已在其他位置登录')).toBeVisible();
    await pageA.getByRole('button', { name: '返回登录' }).click();
    await expect(pageA.getByText('登录')).toBeVisible();
  });
});