import { test, expect } from '@playwright/test';

test('작은 메모와 페이지가 같은 내용과 자동 저장을 공유', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '내 메모 열기' }).click();
  await page.getByLabel('메모 내용', { exact: true }).fill('작은 메모에서 작성');
  await page.getByRole('button', { name: '메모장', exact: true }).click();
  await expect(page).toHaveURL(/\/memo$/);
  await expect(page.getByRole('heading', { name: '메모장', exact: true })).toBeVisible();
  await expect(page.getByLabel('메모 내용', { exact: true })).toHaveValue('작은 메모에서 작성');
  await expect(page.locator('.memo-panel')).toHaveCount(1);
  await page.getByLabel('메모 내용', { exact: true }).fill('큰 메모에서 수정');
  await page.getByRole('button', { name: '대시보드', exact: true }).click();
  await page.getByRole('button', { name: '내 메모 열기' }).click();
  await expect(page.getByLabel('메모 내용', { exact: true })).toHaveValue('큰 메모에서 수정');
  await expect(page.locator('.memo-footer')).toContainText('자동 저장됨');
  await page.getByRole('button', { name: '메모장', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('메모 내용', { exact: true })).toHaveValue('큰 메모에서 수정');
  await expect(page.locator('aside')).not.toContainText('작은 관심이 모여');
  await expect(page.locator('aside')).not.toContainText('©');
});
