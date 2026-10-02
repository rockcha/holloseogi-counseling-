import { test, expect } from '@playwright/test';

for (const admin of [true, false, undefined]) {
  test(`CONTROL CENTER requires is_admin true: ${admin}`, async ({ page }) => {
    const id = '11111111-1111-4111-8111-111111111111';
    const logRequests: string[] = [];
    await page.route('https://counsel-test.supabase.co/**', async route => {
      const url = route.request().url();
      if (url.includes('/auth/v1/token')) return route.fulfill({ json: {
        access_token: 'test-token', refresh_token: 'refresh', expires_in: 3600,
        token_type: 'bearer', user: { id, email: 'teacher@example.com',
          aud: 'authenticated', role: 'authenticated', app_metadata: {},
          user_metadata: {}, created_at: new Date().toISOString() },
      } });
      if (url.includes('/rest/v1/profiles')) return route.fulfill({ json:
        url.includes('select=name') ? [] : { id, name: '선생님', is_teacher: true, is_admin: admin },
      });
      if (url.includes('/rest/v1/activity_logs')) logRequests.push(url);
      return route.fulfill({ json: [] });
    });
    await page.goto('/activity-logs');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await page.getByLabel('이메일', { exact: true }).fill('teacher@example.com');
    await page.getByLabel('비밀번호', { exact: true }).fill('password123');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page.locator('.sidebar')).toBeVisible();
    const group = page.getByRole('button', { name: 'CONTROL CENTER 접기', exact: true });
    if (admin === true) {
      await expect(group).toBeVisible();
      await expect(page.getByRole('heading', { name: '활동 로그', exact: true })).toBeVisible();
      await expect.poll(() => logRequests.length).toBeGreaterThan(0);
      await page.locator('.sidebar').getByRole('button', { name: '내 상담실', exact: true }).click();
      await page.locator('.sidebar').getByRole('button', { name: '활동 로그', exact: true }).click();
      await expect(page).toHaveURL(/\/activity-logs$/);
    } else {
      await expect(group).toHaveCount(0);
      await expect(page.locator('.sidebar').getByRole('button', { name: '활동 로그', exact: true })).toHaveCount(0);
      await expect(page.getByRole('status')).toContainText('관리자만 접근');
      expect(logRequests).toEqual([]);
    }
  });
}
