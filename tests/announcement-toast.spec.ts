import { test, expect } from '@playwright/test';

test('새 전달 내용 알림과 보기, 중복 및 본인 글 제외', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '알림', exact: true })).toBeVisible();
  const addPost = async (id: string, author: string) => page.evaluate(({ id, author }) => {
    const key = 'holoseogi-announcements';
    const rows = JSON.parse(localStorage.getItem(key) ?? '[]');
    localStorage.setItem(key, JSON.stringify([...rows, { id, author_id: author, author_name: '선생님', title: '새 공지', content: '확인 부탁드립니다.', building: null, created_at: new Date().toISOString() }]));
    window.dispatchEvent(new Event('announcements-changed'));
  }, { id, author });
  await addPost('new-post', 'other-teacher');
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: '새로운 전달내용이 있습니다.' });
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: '보기', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('확인 부탁드립니다.');
  await expect(toast).toHaveCount(0);
  await page.keyboard.press('Escape');
  await addPost('own-post', 'local-teacher');
  await page.getByRole('button', { name: '전달 내용', exact: true }).click();
  await expect(page.locator('.announcement-row')).toHaveCount(2);
  await expect(toast).toHaveCount(0);
});
