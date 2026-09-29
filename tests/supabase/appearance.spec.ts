import { test, expect, type Page } from '@playwright/test';

const owner = 'teacher-theme';
const user = { id: owner, email: 'theme@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };

async function mockApi(page: Page, state: { theme: string; failSave?: boolean; failLoad?: boolean }) {
  await page.route('https://counsel-test.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/token')) return route.fulfill({ json: { access_token: 'test-token', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user } });
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user });
    if (url.pathname.endsWith('/profiles')) return route.fulfill({ json: { id: owner, name: '테마 선생님', is_teacher: true, is_admin: false } });
    if (url.pathname.endsWith('/user_preferences')) {
      if (request.method() === 'GET') {
        expect(url.searchParams.get('owner_id')).toBe(`eq.${owner}`);
        if (state.failLoad) return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
      } else {
        expect(request.method()).toBe('POST');
        expect(request.postDataJSON().owner_id).toBe(owner);
        expect(url.searchParams.get('on_conflict')).toBe('owner_id');
        if (state.failSave) return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
        state.theme = request.postDataJSON().background_theme;
      }
      return route.fulfill({ json: { background_theme: state.theme } });
    }
    return route.fulfill({ json: [] });
  });
}

async function login(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.getByLabel('이메일', { exact: true }).fill(user.email);
  await page.getByLabel('비밀번호', { exact: true }).fill('password123');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('button', { name: '상담실 배경색 선택' })).toBeVisible();
}

test('서버에 색상을 저장하고 새 브라우저에서도 같은 계정의 색을 불러온다', async ({ page, browser }) => {
  const state = { theme: 'mint' };
  await mockApi(page, state);
  await login(page);
  await expect(page.locator('.workspace')).toHaveCSS('background-color', 'rgb(232, 244, 238)');
  await page.getByRole('button', { name: '상담실 배경색 선택' }).click();
  await page.getByRole('button', { name: '라벤더', exact: true }).click();
  await expect.poll(() => state.theme).toBe('lavender');
  await page.reload();
  await expect(page.locator('.workspace')).toHaveCSS('background-color', 'rgb(239, 235, 248)');
  const otherContext = await browser.newContext({ baseURL: 'http://127.0.0.1:5175' });
  try {
    const otherPage = await otherContext.newPage();
    await mockApi(otherPage, state);
    // A separate browser has no local preference or session from the first one.
    await login(otherPage);
    for (const path of ['/students', '/counseling', '/calendar', '/timetable']) {
      await otherPage.goto(`http://127.0.0.1:5175${path}`);
      await expect(otherPage.locator('.workspace')).toHaveCSS('background-color', 'rgb(239, 235, 248)');
    }
  } finally {
    await otherContext.close();
  }
});

test('저장 실패 시 이전 색으로 복원하고 다시 저장할 수 있다', async ({ page }) => {
  const state = { theme: 'mint', failSave: true };
  await mockApi(page, state);
  await login(page);
  await page.getByRole('button', { name: '상담실 배경색 선택' }).click();
  await page.getByRole('button', { name: '피치', exact: true }).click();
  await expect(page.getByText('배경색을 저장하지 못했습니다. 다시 선택해 주세요.')).toBeVisible();
  await expect(page.locator('.workspace')).toHaveCSS('background-color', 'rgb(232, 244, 238)');
  expect(state.theme).toBe('mint');
  state.failSave = false;
  await page.getByRole('button', { name: '피치', exact: true }).click();
  await expect.poll(() => state.theme).toBe('peach');
  await expect(page.locator('.workspace')).toHaveCSS('background-color', 'rgb(251, 236, 228)');
});
