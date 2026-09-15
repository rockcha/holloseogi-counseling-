import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-15T12:00:00+09:00') });
  await page.addInitScript(() => {
    localStorage.setItem('holoseogi-students', JSON.stringify([
      { id: 'a', name: '가학생', building: 1, seat_number: 'W01', counseling_cycle_weeks: 1 },
      { id: 'b', name: '나학생', building: 2, seat_number: 'W02', counseling_cycle_weeks: 1 },
    ]));
    localStorage.setItem('holoseogi-counseling-journals', JSON.stringify([
      { id: '1', student_id: 'a', date: '2026-09-14', created_at: '2026-09-14T00:00:00Z' },
      { id: '2', student_id: 'a', date: '2026-09-01', created_at: '2026-09-01T00:00:00Z' },
      { id: '3', student_id: 'b', date: '2026-09-15', created_at: '2026-09-15T00:00:00Z' },
      { id: '4', student_id: 'b', date: '2026-08-31', created_at: '2026-08-31T00:00:00Z' },
    ]));
  });
});

test('하위 메뉴 선택, 학생 추가 창 닫기, 작성 진입과 새로고침', async ({ page }) => {
  await page.goto('/students');
  const list = page.getByRole('button', { name: '학생 리스트', exact: true });
  await expect(list).toHaveAttribute('aria-current', 'page');
  await expect(list).toHaveCSS('font-weight', '700');
  await expect(page.getByRole('button', { name: '학생 추가하기', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '상담일지 작성', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '학생 추가', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/students$/);
  await page.goto('/counseling/students/a/new');
  await expect(page).toHaveURL(/\/counseling\/students\/a\/new$/);
  await expect(page.getByRole('button', { name: '상담 리스트', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(page.getByRole('textbox', { name: '내용', exact: true })).toBeVisible();
});

test('통계는 상담 날짜와 관 필터에 따라 집계한다', async ({ page }) => {
  await page.goto('/counseling/statistics');
  await expect(page.locator('.sidebar-subitem[aria-current="page"]')).toHaveText('통계');
  await expect(page.getByText('이번 주 상담', { exact: true }).locator('..')).toContainText('2건');
  await expect(page.getByText('이번 달 상담', { exact: true }).locator('..')).toContainText('3건');
  await expect(page.getByRole('row').filter({ hasText: '가학생' })).toContainText('2건');
  await page.getByRole('button', { name: '이번 주', exact: true }).click();
  await expect(page.locator('tbody tr td:first-child')).toHaveText(['1', '1']);
  await page.getByRole('group', { name: '공통 관 선택' }).getByRole('button', { name: '1관' }).click();
  await expect(page.getByText('이번 주 상담', { exact: true }).locator('..')).toContainText('1건');
  await expect(page.getByRole('row').filter({ hasText: '나학생' })).toHaveCount(0);
});

test('내 상담실 이름과 학생 통계 및 관별 학생 수', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '내 상담실', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '통계', exact: true }).first().click();
  await expect(page).toHaveURL(/\/students\/statistics$/);
  await expect(page.getByRole('heading', { name: '학생 통계', exact: true })).toBeVisible();
  await expect(page.getByText('전체 학생 수', { exact: true }).locator('..')).toContainText('2명');
  await page.getByRole('group', { name: '공통 관 선택' }).getByRole('button', { name: '1관' }).click();
  await expect(page.getByText('전체 학생 수', { exact: true }).locator('..')).toContainText('1명');
  await page.reload();
  await expect(page.getByRole('heading', { name: '학생 통계', exact: true })).toBeVisible();
  await expect(page.locator('.sidebar-subitem[aria-current="page"]')).toHaveCSS('font-weight', '700');
});
