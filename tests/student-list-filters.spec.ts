import { test, expect } from '@playwright/test';

test('학생 리스트에서 이름, 좌석, 학년 및 관 필터를 함께 적용한다', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('holoseogi-students', JSON.stringify([
      { id: 's1', name: '가학생', building: 1, seat_number: 'M1', grade: '고1' },
      { id: 's2', name: '나학생', building: 1, seat_number: 'W1', grade: '고2' },
      { id: 's3', name: '다학생', building: 2, seat_number: 'M2', grade: '고2' },
      { id: 's4', name: '라학생', building: 2, seat_number: '502-1', grade: null },
    ].map(student => ({ ...student, counseling_cycle_weeks: 1 }))));
  });
  await page.goto('/students');
  const rows = page.locator('tbody tr');
  const seat = page.getByRole('combobox', { name: '좌석 필터', exact: true });
  const grade = page.getByRole('combobox', { name: '학년 필터', exact: true });
  await expect(rows).toHaveCount(4);
  await grade.selectOption('고2');
  await expect(rows).toHaveCount(2);
  await seat.selectOption('M');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('다학생');
  await page.getByRole('textbox', { name: '학생 검색' }).fill('나학생');
  await expect(rows).toHaveCount(0);
  await expect(page.getByText('검색 조건에 맞는 학생이 없습니다.')).toBeVisible();
  await page.getByRole('textbox', { name: '학생 검색' }).clear();
  await grade.selectOption('unknown');
  await seat.selectOption('502');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('라학생');
  await grade.selectOption('all');
  await page.getByRole('group', { name: '공통 관 선택' }).getByRole('button', { name: '1관', exact: true }).click();
  await expect(seat).toHaveValue('all');
  await expect(seat.getByRole('option', { name: '502호' })).toHaveCount(0);
  await expect(rows).toHaveCount(2);
  await expect(page.getByRole('heading', { name: '학생 리스트 2명' })).toBeVisible();
});
