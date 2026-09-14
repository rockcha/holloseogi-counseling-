import { test, expect } from '@playwright/test';

test('본인 전달 내용 삭제: 취소, 서버 거절, 성공 및 다른 작성자 버튼 숨김', async ({ page }) => {
  const id = '11111111-1111-4111-8111-111111111111';
  let rows = [
    { id: 'own', title: '내 전달 내용', author_id: id },
    { id: 'other', title: '다른 전달 내용', author_id: '22222222-2222-4222-8222-222222222222' },
  ].map(row => ({ ...row, content: '본문', author_name: '선생님', category: 'announcement', building: null, created_at: new Date().toISOString() }));
  let deletes = 0;
  let denied = true;
  await page.route('https://counsel-test.supabase.co/**', async route => {
    const req = route.request(), url = req.url();
    if (url.includes('/auth/v1/token')) return route.fulfill({ json: { access_token: 'test-token', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user: { id, email: 'teacher@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } } });
    if (url.includes('/rest/v1/profiles')) return route.fulfill({ json: { id, name: '선생님', is_teacher: true } });
    if (url.includes('/rest/v1/announcements?')) {
      if (req.method() === 'DELETE') {
        deletes++;
        expect(new URL(url).searchParams.get('author_id')).toBe(`eq.${id}`);
        if (denied) return route.fulfill({ json: [] });
        rows = rows.filter(row => row.id !== 'own');
        return route.fulfill({ json: [{ id: 'own' }] });
      }
      return route.fulfill({ json: rows });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/community/announcements/other');
  await page.getByLabel('이메일', { exact: true }).fill('teacher@example.com');
  await page.getByLabel('비밀번호', { exact: true }).fill('password123');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('heading', { name: '다른 전달 내용' })).toBeVisible();
  await expect(page.getByRole('button', { name: '삭제', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '전달 내용 목록', exact: true }).click();
  await page.locator('.announcement-row').filter({ hasText: '내 전달 내용' }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  const guard = page.getByRole('alertdialog');
  await expect(guard).toContainText('삭제하시겠습니까?');
  await guard.getByRole('button', { name: '취소' }).click();
  expect(deletes).toBe(0);
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await guard.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(guard.getByRole('alert')).toContainText('삭제하지 못했습니다');
  denied = false;
  await guard.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(guard).toHaveCount(0);
  await expect(page).toHaveURL(/\/community\/announcements$/);
  await expect(page.locator('.announcement-row').filter({ hasText: '내 전달 내용' })).toHaveCount(0);
});
