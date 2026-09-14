import { test, expect } from '@playwright/test';

test('개별 상담에서 이전과 다음으로 이동하고 양 끝에서는 버튼을 비활성화한다', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('holoseogi-students', JSON.stringify([{ id: 'nav-student', name: '이동학생', seat_number: 'W02', building: 1, counseling_cycle_weeks: 1 }]));
    localStorage.setItem('holoseogi-counseling-journals', JSON.stringify([
      { id: 'recent', date: '2026-02-01', created_at: '2026-02-01T02:00:00Z', content: '최근 상담' },
      { id: 'old', date: '2026-01-01', created_at: '2026-01-01T00:00:00Z', content: '오래된 상담' },
      { id: 'middle', date: '2026-02-01', created_at: '2026-02-01T01:00:00Z', content: '중간 상담' },
    ].map(row => ({ ...row, student_id: 'nav-student', counselor_name: '김선생', special_notes: '' }))));
  });
  await page.goto('/counseling/students/nav-student');
  await expect(page.getByRole('link', { name: '전체 상담내역 보기' })).toHaveCount(0);
  await page.getByRole('link', { name: '2026.01.01' }).click();
  const previous = page.getByRole('button', { name: '이전으로', exact: true });
  const next = page.getByRole('button', { name: '다음으로', exact: true });
  const content = page.getByRole('textbox', { name: '내용', exact: true });
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(page).toHaveURL(/\/journals\/middle$/);
  await expect(content).toHaveValue('중간 상담');
  await expect(previous).toBeEnabled();
  await next.click();
  await expect(content).toHaveValue('최근 상담');
  await expect(next).toBeDisabled();
  await previous.click();
  await expect(content).toHaveValue('중간 상담');
  await previous.click();
  await expect(content).toHaveValue('오래된 상담');
  await expect(previous).toBeDisabled();
});
