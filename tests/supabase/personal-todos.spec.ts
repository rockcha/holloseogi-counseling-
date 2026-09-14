import { test, expect } from '@playwright/test';
import type { PersonalTodo } from '../../src/lib/personal-todos';

test('개인 할 일 요청의 소유자 필터와 저장 실패 시 입력·체크 상태 유지', async ({ page }) => {
  const owner = '11111111-1111-4111-8111-111111111111';
  let rows: PersonalTodo[] = [];
  let failLoad = true;
  let failWrite = false;
  await page.route('https://counsel-test.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/token')) return route.fulfill({ json: { access_token: 'test-token', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user: { id: owner, email: 'teacher@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } } });
    if (url.pathname.endsWith('/profiles')) return route.fulfill({ json: { id: owner, name: '김선생', is_teacher: true } });
    if (url.pathname.endsWith('/personal_todos')) {
      if (request.method() !== 'POST') expect(url.searchParams.get('owner_id')).toBe(`eq.${owner}`);
      if (request.method() === 'GET') return failLoad ? route.fulfill({ status: 403, json: { message: 'Denied' } }) : route.fulfill({ json: rows });
      if (failWrite) return route.fulfill({ status: 403, json: { message: 'Denied' } });
      if (request.method() === 'POST') {
        const draft = request.postDataJSON();
        expect(draft.owner_id).toBe(owner);
        const row = { ...draft, id: 'todo-one', completed: false, created_at: new Date().toISOString() };
        rows.push(row);
        return route.fulfill({ json: row });
      }
      if (request.method() === 'PATCH') {
        expect(url.searchParams.get('id')).toBe('eq.todo-one');
        rows[0] = { ...rows[0], ...request.postDataJSON() };
        return route.fulfill({ json: rows[0] });
      }
      if (request.method() === 'DELETE') {
        rows = [];
        return route.fulfill({ status: 204, body: '' });
      }
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/todos');
  await page.getByLabel('이메일', { exact: true }).fill('teacher@example.com');
  await page.getByLabel('비밀번호', { exact: true }).fill('password123');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('할 일을 불러오지 못했습니다.');
  await expect(page.getByRole('textbox', { name: '새 할 일' })).toBeDisabled();
  failLoad = false;
  await page.getByRole('button', { name: '다시 불러오기', exact: true }).click();
  const input = page.getByRole('textbox', { name: '새 할 일' });
  await input.fill('개인 확인 사항');
  failWrite = true;
  await page.getByRole('button', { name: '추가', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('저장하지 못했습니다.');
  await expect(input).toHaveValue('개인 확인 사항');
  expect(rows).toHaveLength(0);
  failWrite = false;
  await page.getByRole('button', { name: '추가', exact: true }).click();
  const checkbox = page.getByRole('checkbox', { name: '개인 확인 사항' });
  await expect(checkbox).toBeVisible();
  failWrite = true;
  await checkbox.click();
  await expect(page.getByRole('alert')).toContainText('저장하지 못했습니다.');
  await expect(checkbox).not.toBeChecked();
  failWrite = false;
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await page.getByRole('button', { name: '개인 확인 사항 삭제' }).click();
  await expect(checkbox).toHaveCount(0);
});
