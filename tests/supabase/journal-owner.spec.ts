import { test, expect } from '@playwright/test';

for (const owner of ['self', 'other', 'missing']) {
  test(`상담일지 작성자 권한: ${owner}`, async ({ page }) => {
    const id = '11111111-1111-4111-8111-111111111111';
    let patch: Record<string, unknown> | null = null;
    const journal = { id: 'journal', student_id: id, counselor_id: owner === 'self' ? id : owner === 'other' ? 'other-id' : null, counselor_name: '김선생', date: '2026-01-01', content: '상담 내용', special_notes: '', created_at: '2026-01-01T00:00:00Z' };
    await page.route('https://counsel-test.supabase.co/**', async route => {
      const request = route.request(), url = request.url();
      if (url.includes('/auth/v1/token')) return route.fulfill({ json: { access_token: 'test-token', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user: { id, email: 'teacher@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } } });
      if (url.includes('/rest/v1/profiles')) return route.fulfill({ json: { id, name: '김선생', is_teacher: true } });
      if (url.includes('/rest/v1/students')) return route.fulfill({ json: [{ id, name: '학생', building: 1, seat_number: 'W01', counseling_cycle_weeks: 1 }] });
      if (url.includes('/rest/v1/counseling_journals')) {
        if (request.method() === 'PATCH') {
          patch = request.postDataJSON();
          return route.fulfill({ json: { ...journal, ...patch } });
        }
        return route.fulfill({ json: [journal] });
      }
      return route.fulfill({ json: [] });
    });
    await page.goto(`/counseling/students/${id}/journals/journal`);
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await page.getByLabel('이메일', { exact: true }).fill('teacher@example.com');
    await page.getByLabel('비밀번호', { exact: true }).fill('password123');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    const content = page.getByRole('textbox', { name: '내용', exact: true });
    await expect(content).toHaveValue('상담 내용');
    if (owner === 'self') {
      await expect(content).toBeEditable();
      await expect(page.getByRole('button', { name: '삭제', exact: true })).toBeVisible();
      await content.fill('수정 내용');
      await page.getByRole('button', { name: '저장하기' }).first().click();
      await expect(page).toHaveURL(new RegExp(`/students/${id}$`));
      expect(patch).toEqual({ date: '2026-01-01', content: '수정 내용', special_notes: '', parent_message_sent: false });
    } else {
      await expect(content).not.toBeEditable();
      await expect(page.getByRole('checkbox', { name: '부모님 문자 전송 완료' })).toBeDisabled();
      await expect(page.getByRole('textbox', { name: '날짜', exact: true })).not.toBeEditable();
      await expect(page.getByRole('textbox', { name: '특이사항', exact: true })).not.toBeEditable();
      await expect(page.getByRole('button', { name: '저장하기' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '삭제', exact: true })).toHaveCount(0);
      expect(patch).toBeNull();
    }
  });
}
