import { test, expect } from '@playwright/test';

test('fixed sidebar reserves space and memo opens from the header', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.memo-dashboard-host, .memo-floating-launcher, .topbar-brand')).toHaveCount(0);
  await expect(page.locator('.topbar button[aria-label="\uce98\ub9b0\ub354"]')).toHaveCount(0);
  await expect(page.locator('.drawer-launcher, .back-launcher')).toHaveCount(0);
  for (const width of [1440, 1024, 800, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const sidebar = await page.locator('.sidebar').boundingBox();
    const workspace = await page.locator('.workspace').boundingBox();
    expect(sidebar!.x).toBe(0);
    expect(workspace!.x).toBe(sidebar!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const input = page.locator('.dashboard-shared-memo textarea');
    expect((await input.boundingBox())!.height).toBeGreaterThan(300);
  }
  await page.setViewportSize({ width: 1440, height: 773 });
  for (const section of await page.locator('.dashboard-section').all()) {
    const box = await section.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(773 - 60);
  }
  await page.locator('.topbar button[aria-controls="personal-memo"]').click();
  await expect(page.locator('.memo-panel')).toBeVisible();
  await page.locator('.memo-panel textarea').fill('persistent sidebar memo');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('holoseogi-demo-memo'))).toBe('persistent sidebar memo');
});
