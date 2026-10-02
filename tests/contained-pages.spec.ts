import { test, expect } from '@playwright/test';

for (const path of ['/students', '/students/statistics', '/counseling', '/counseling/teachers', '/counseling/statistics']) {
  test(`${path} keeps page scrolling inside its section`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('holoseogi-students', JSON.stringify(Array.from({ length: 80 }, (_, index) => ({
        id: `student-${index}`, name: `학생${index}`, building: 1,
        seat_number: `M${index + 1}`, grade: '고1', counseling_cycle_weeks: 1,
      }))));
    });
    await page.goto(path);
    await expect(page.locator('.workspace-contained')).toBeVisible();
    for (const size of [{ width: 1440, height: 773 }, { width: 1280, height: 650 }, { width: 800, height: 900 }]) {
      await page.setViewportSize(size);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(size.height);
      const panel = await page.locator('.main > .panel').boundingBox();
      expect(panel!.y + panel!.height).toBeLessThanOrEqual(size.height - 70);
    }
    if (path === '/students' || path === '/counseling') {
      const table = page.locator('.page-table-wrap');
      await expect(table.locator('tbody tr')).toHaveCount(80);
      expect(await table.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
      await table.evaluate(node => { node.scrollTop = node.scrollHeight; });
      expect(await table.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    }
  });
}
