import { test, expect } from '@playwright/test';

test('미저장 상담일지: 목록 이동과 브라우저 뒤로가기 커스텀 확인', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('holoseogi-students', JSON.stringify([{ id: 'guard-student', name: '테스트학생', seat_number: 'W02', building: 1, counseling_cycle_weeks: 1 }]));
    localStorage.setItem('holoseogi-counseling-journals', JSON.stringify([{ id: 'guard-journal', student_id: 'guard-student', date: '2026-01-01', counselor_name: '김선생', content: '기존 내용', special_notes: '', created_at: '2026-01-01T00:00:00Z' }]));
  });
  page.on('dialog', async dialog => { await dialog.dismiss(); throw new Error('Native dialog must not be used for internal navigation'); });
  await page.goto('/counseling/students/guard-student');
  await page.getByRole('row').filter({ hasText: '김선생' }).click();
  const content = page.getByRole('textbox', { name: '내용', exact: true });
  await expect(content).toHaveAttribute('spellcheck', 'false');
  await expect(content).toHaveCSS('font-size', '16px');
  await content.fill('저장 전 수정');
  await page.getByRole('button', { name: '목록으로' }).first().click();
  const modal = page.getByRole('alertdialog');
  await expect(modal).toContainText('저장하지 않고 나가시겠습니까?');
  await modal.getByRole('button', { name: '계속 작성' }).click();
  await expect(content).toHaveValue('저장 전 수정');
  await page.evaluate(() => history.back());
  await expect(modal).toBeVisible();
  await expect(page).toHaveURL(/journals\/guard-journal$/);
  await modal.getByRole('button', { name: '계속 작성' }).click();
  await expect(content).toHaveValue('저장 전 수정');
  await page.evaluate(() => history.back());
  await modal.getByRole('button', { name: '저장하지 않고 나가기' }).click();
  await expect(page).toHaveURL(/students\/guard-student$/);
  await page.getByRole('row').filter({ hasText: '김선생' }).click();
  await expect(content).toHaveValue('기존 내용');
});
