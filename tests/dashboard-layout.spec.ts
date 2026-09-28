import { test, expect } from '@playwright/test';

test('상담실의 세 칸은 같은 너비이고 모바일에서는 세로로 배치된다', async ({ page }) => {
  await page.goto('/');
  const columns = page.locator('.dashboard-columns > *');
  await expect(columns).toHaveCount(3);
  for (const width of [1280, 1440, 1920, 800, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const boxes = await columns.evaluateAll(nodes => nodes.map(node => {
      const { x, y, width, bottom } = node.getBoundingClientRect();
      return { x, y, width, bottom };
    }));
    for (const box of boxes) expect(Math.abs(box.width - boxes[0].width)).toBeLessThan(1);
    if (width === 390) {
      expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].bottom);
      expect(boxes[2].y).toBeGreaterThanOrEqual(boxes[1].bottom);
    } else {
      expect(boxes[1].y).toBe(boxes[0].y);
      expect(boxes[2].y).toBe(boxes[0].y);
      expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
      expect(boxes[2].x).toBeGreaterThan(boxes[1].x);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('이전 할 일 주소에서 상담실을 표시하고 개인 할 일 요청을 보내지 않는다', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('personal_todos')) requests.push(request.url());
  });
  await page.goto('/todos');
  await expect(page.getByRole('heading', { name: '내 상담실', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '할 일', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '내 할 일 열기', exact: true })).toHaveCount(0);
  expect(requests).toEqual([]);
});
