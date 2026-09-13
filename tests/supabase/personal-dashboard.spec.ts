import { test, expect } from '@playwright/test';

for (const teacher of ['teacher-a', 'teacher-b']) {
  test(`대시보드는 로그인한 선생님의 예정과 완료만 표시: ${teacher}`, async ({ page }) => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
    const mine = teacher === 'teacher-a' ? 'a' : 'b';
    const other = mine === 'a' ? 'b' : 'a';
    const students = [
      ...['a', 'b', 'planned'].map((id, i) => ({ id, name: `학생${id}`, building: 1, seat_number: `W0${i + 1}`, counseling_cycle_weeks: 1 })),
      { id: 'legacy', name: '미배정 학생', building: null, seat_number: null, counseling_cycle_weeks: 1 },
    ];
    let ownerFilter = '';
    await page.route('https://counsel-test.supabase.co/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/token')) return route.fulfill({ json: { access_token: 'test-token', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user: { id: teacher, email: 'teacher@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } } });
      if (url.pathname.endsWith('/profiles')) return route.fulfill({ json: { id: teacher, name: teacher, is_teacher: true } });
      if (url.pathname.endsWith('/students')) return route.fulfill({ json: students });
      if (url.pathname.endsWith('/student_latest_counsels')) return route.fulfill({ json: students.map(s => ({ student_id: s.id, latest_date: today, journal_count: 1 })) });
      if (url.pathname.endsWith('/my_student_latest_counsels')) return route.fulfill({ json: [{ student_id: mine, latest_date: today, journal_count: 1 }] });
      if (url.pathname.endsWith('/counseling_plans')) {
        ownerFilter = url.searchParams.get('created_by') ?? '';
        return route.fulfill({ json: ownerFilter === `eq.${teacher}` ? [{ id: 'plan', student_id: 'planned', date: today, time: '00:00:00', note: '', created_by: teacher }] : [] });
      }
      // A different teacher sent a message for my student; it must not count as mine.
      if (url.pathname.endsWith('/student_latest_parent_messages')) return route.fulfill({ json: [{ student_id: mine, last_sent_date: today }] });
      return route.fulfill({ json: [] });
    });
    await page.goto('/');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await page.getByLabel('이메일', { exact: true }).fill('teacher@example.com');
    await page.getByLabel('비밀번호', { exact: true }).fill('password123');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    const done = page.getByRole('region', { name: '오늘 상담한 학생', exact: true });
    await expect(done.getByRole('button', { name: new RegExp(`학생${mine} 상담 상세`) })).toBeVisible();
    await expect(done.getByRole('button', { name: new RegExp(`학생${other} 상담 상세`) })).toHaveCount(0);
    await expect(done).toContainText('0/1');
    // Another teacher's completed journal must not hide my scheduled student.
    await expect(page.getByRole('region', { name: '상담 예정', exact: true }).getByRole('button', { name: /학생planned 상담 상세/ })).toBeVisible();
    expect(ownerFilter).toBe(`eq.${teacher}`);
  });
}
