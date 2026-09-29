import { test, expect } from '@playwright/test';

test('미연결 예시 모드에서 배경을 미리 보고 모바일 팔레트를 사용한다', async ({ page }) => {
  await page.goto('/');
  const workspace = page.locator('.workspace');
  const picker = page.getByRole('button', { name: '상담실 배경색 선택' });
  await picker.click();
  const colors = page.getByRole('group', { name: '배경 색상' });
  await expect(colors.getByRole('button')).toHaveCount(8);
  await colors.getByRole('button', { name: '라벤더', exact: true }).click();
  await expect(workspace).toHaveCSS('background-color', 'rgb(239, 235, 248)');
  await expect(colors.getByRole('button', { name: '라벤더', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(colors).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await picker.click();
  const box = await page.getByRole('dialog', { name: '상담실 배경색', exact: true }).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await colors.getByRole('button', { name: '기본', exact: true }).click();
  await expect(workspace).toHaveCSS('background-color', 'rgb(244, 246, 250)');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('holoseogi-dashboard-background:')))).toEqual([]);
});
