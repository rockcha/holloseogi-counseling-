import { test, expect } from '@playwright/test';

test('상담일지 인쇄는 현재 좌석과 편집 내용을 반영하고 지정된 항목만 출력한다', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('holoseogi-students', JSON.stringify([
      { id: 'print-student', name: '인쇄학생', building: 1, seat_number: 'M12', counseling_cycle_weeks: 1 },
    ]));
    localStorage.setItem('holoseogi-counseling-journals', JSON.stringify([
      { id: 'print-journal', student_id: 'print-student', date: '2026-09-01', counselor_name: '김선생', content: '<p>첫 줄</p><p><strong>강조 내용</strong></p>', special_notes: '출력에서 제외할 특이사항', created_at: '2026-09-01T00:00:00Z' },
    ]));
    window.print = () => { window.dispatchEvent(new Event('beforeprint')); };
  });
  await page.goto('/counseling/students/print-student/journals/print-journal');
  const button = page.getByRole('button', { name: '인쇄', exact: true });
  await expect(button).toBeVisible();
  const printed = page.locator('.journal-print');
  await expect(printed).toBeHidden();
  await page.locator('input[name="date"]').fill('2026-09-02');
  await page.getByRole('textbox', { name: '내용', exact: true }).fill('수정한 내용\n두 번째 줄');
  await button.click();
  await page.emulateMedia({ media: 'print' });
  await expect(printed).toBeVisible();
  await expect(printed.locator('dt')).toHaveText(['좌석', '이름', '날짜', '상담자']);
  await expect(printed.locator('dd')).toHaveText(['M12', '인쇄학생', '2026-09-02', '김선생']);
  await expect(printed).toContainText('수정한 내용');
  await expect(printed).toContainText('두 번째 줄');
  await expect(printed).not.toContainText('출력에서 제외할 특이사항');
  await expect(page.locator('#root')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await expect(button).toBeVisible();
  await expect(printed).toBeHidden();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('holoseogi-counseling-journals')!)[0].date)).toBe('2026-09-01');
});
