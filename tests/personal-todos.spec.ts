import { test, expect } from '@playwright/test';

test('할 일 페이지와 모달에서 추가·완료·해제·삭제를 공유하고 새로고침 후 유지한다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '할 일', exact: true }).click();
  await expect(page).toHaveURL(/\/todos$/);
  await expect(page.getByRole('group', { name: '공통 관 선택' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '추가', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: '새 할 일' }).fill('수학 학습계획 확인');
  await page.getByRole('button', { name: '추가', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: '수학 학습계획 확인' })).not.toBeChecked();
  await page.getByRole('button', { name: '내 할 일 열기' }).click();
  const modal = page.getByRole('dialog', { name: '할 일', exact: true });
  await modal.getByRole('checkbox', { name: '수학 학습계획 확인' }).check();
  await expect(modal.getByRole('status')).toHaveText('남은 할 일 0개 · 완료 1개');
  await modal.getByRole('textbox', { name: '새 할 일' }).fill('학부모 연락');
  await modal.getByRole('button', { name: '추가', exact: true }).click();
  await expect(modal.getByRole('checkbox', { name: '학부모 연락' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: '수학 학습계획 확인' })).toBeChecked();
  await page.reload();
  await expect(page.getByRole('heading', { name: '할 일', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '수학 학습계획 확인' })).toBeChecked();
  await page.getByRole('checkbox', { name: '수학 학습계획 확인' }).uncheck();
  await expect(page.getByRole('status')).toHaveText('남은 할 일 2개 · 완료 0개');
  await page.getByRole('button', { name: '학부모 연락 삭제' }).click();
  await expect(page.getByRole('checkbox', { name: '학부모 연락' })).toHaveCount(0);
  await page.getByRole('button', { name: '메모장', exact: true }).click();
  await page.getByRole('button', { name: '내 할 일 열기' }).click();
  await expect(modal.getByRole('checkbox', { name: '수학 학습계획 확인' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goBack();
  await expect(page).toHaveURL(/\/todos$/);
  await expect(page.getByRole('checkbox', { name: '수학 학습계획 확인' })).toBeVisible();
});

test('모바일에서 할 일 모달이 화면 안에 표시된다', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/todos');
  await page.getByRole('button', { name: '내 할 일 열기' }).click();
  const modal = page.getByRole('dialog', { name: '할 일', exact: true });
  await expect(modal).toBeVisible();
  const box = await modal.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  expect(box!.height).toBeLessThanOrEqual(667);
});
