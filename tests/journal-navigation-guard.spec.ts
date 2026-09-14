import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('guard-seeded')) return;
    localStorage.setItem('guard-seeded', '1');
    localStorage.setItem('holoseogi-students', JSON.stringify([{ id: 'guard-student', name: '가드학생', seat_number: 'W02', building: 1, counseling_cycle_weeks: 1 }]));
    localStorage.setItem('holoseogi-counseling-journals', JSON.stringify([{ id: 'guard-journal', student_id: 'guard-student', date: '2026-01-01', created_at: '2026-01-01T00:00:00Z', content: '기존 내용', counselor_name: '김선생', special_notes: '' }]));
  });
});

test('새 상담은 목록·메뉴·뒤로가기 취소 시 내용을 유지하고 확인 시 이동한다', async ({ page }) => {
  await page.goto('/counseling/students/guard-student');
  await page.getByRole('button', { name: '상담일지 작성', exact: true }).click();
  const content = page.getByRole('textbox', { name: '내용', exact: true });
  await content.fill('작성 중인 상담');
  let warnings = 0;
  const dismiss = async (dialog: import('@playwright/test').Dialog) => {
    expect(dialog.message()).toContain('저장하지 않은 상담 내용');
    warnings++;
    await dialog.dismiss();
  };
  page.on('dialog', dismiss);
  await page.getByRole('button', { name: '목록으로', exact: true }).first().click();
  await expect(content).toHaveValue('작성 중인 상담');
  await page.getByRole('button', { name: '대시보드', exact: true }).click();
  await expect(content).toHaveValue('작성 중인 상담');
  await page.evaluate(() => history.back());
  await expect.poll(() => warnings).toBe(3);
  await expect(page).toHaveURL(/\/new$/);
  await expect(content).toHaveValue('작성 중인 상담');
  page.off('dialog', dismiss);
  page.once('dialog', dialog => dialog.accept());
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/students\/guard-student$/);
  await expect(page.getByRole('heading', { name: '상담내역' })).toBeVisible();
});

test('수정 취소·원상복구·저장 성공과 새로고침 경고', async ({ page }) => {
  await page.goto('/counseling/students/guard-student/journals/guard-journal');
  const content = page.getByRole('textbox', { name: '내용', exact: true });
  await content.fill('수정한 내용');
  page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('beforeunload');
    await dialog.dismiss();
  });
  await page.reload({ timeout: 3000 }).catch(() => {});
  await expect(content).toHaveValue('수정한 내용');
  await content.fill('기존 내용');
  page.on('dialog', async dialog => {
    await dialog.dismiss();
    throw new Error('원상복구 또는 저장 후에는 경고가 없어야 합니다.');
  });
  await page.getByRole('button', { name: '목록으로', exact: true }).first().click();
  await expect(page).toHaveURL(/\/students\/guard-student$/);
  await page.getByRole('link', { name: '2026.01.01' }).click();
  await content.fill('저장할 내용');
  await page.getByRole('button', { name: '저장하기' }).first().click();
  await expect(page).toHaveURL(/\/students\/guard-student$/);
  await page.getByRole('link', { name: '2026.01.01' }).click();
  await expect(content).toHaveValue('저장할 내용');
});
