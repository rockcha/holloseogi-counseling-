import { test, expect } from '@playwright/test';

test('세 카드 정렬과 개인별 정렬 상태', async ({ page }) => {
  await page.addInitScript(() => {
    const today = new Date().toLocaleDateString('en-CA');
    localStorage.setItem('holoseogi-students', JSON.stringify(['a', 'b', 'c', 'd'].map((id, i) => ({ id, name: id, building: 1, seat_number: `W0${i + 1}`, counseling_cycle_weeks: 1 }))));
    localStorage.setItem('holoseogi-counseling-plans', JSON.stringify([
      { id: 'p1', student_id: 'a', date: '2026-01-02', time: '10:00', note: '' },
      { id: 'p2', student_id: 'b', date: '2026-01-01', time: '10:00', note: '' },
    ]));
    localStorage.setItem('holoseogi-counseling-journals', JSON.stringify([
      { id: 'j1', student_id: 'c', date: today, created_at: `${today}T10:00:00Z`, content: '내용' },
      { id: 'j2', student_id: 'd', date: today, created_at: `${today}T09:00:00Z`, content: '내용' },
    ]));
  });
  await page.goto('/');
  const planned = page.getByRole('region', { name: '상담 예정', exact: true });
  const done = page.getByRole('region', { name: '오늘 상담한 학생', exact: true });
  await expect(planned.getByRole('button', { name: /상담 상세 보기/ }).first()).toHaveAttribute('aria-label', 'W01 a 상담 상세 보기');
  await planned.getByRole('button', { name: '오래된 순' }).click();
  await expect(planned.getByRole('button', { name: /상담 상세 보기/ }).first()).toHaveAttribute('aria-label', 'W02 b 상담 상세 보기');
  await expect(done.getByRole('button', { name: /상담 상세 보기/ }).first()).toHaveAttribute('aria-label', 'W03 c 상담 상세 보기');
  await done.getByRole('button', { name: '오래된 순' }).click();
  await expect(done.getByRole('button', { name: /상담 상세 보기/ }).first()).toHaveAttribute('aria-label', 'W04 d 상담 상세 보기');
  await expect(planned.getByRole('button', { name: '오래된 순' })).toHaveAttribute('aria-pressed', 'true');
});

test('새 전달과 내 글 댓글만 알림, 상대 시간, 읽음 및 본문 영역', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('notification-seeded')) return;
    localStorage.setItem('notification-seeded', '1');
    const created_at = new Date(Date.now() - 5 * 60_000).toISOString();
    const post = { building: 1, author_name: '작성선생님', content: '짧은 본문', created_at };
    localStorage.setItem('holoseogi-announcements', JSON.stringify([
      { ...post, id: 'own', title: '내 글', author_id: 'local-teacher' },
      { ...post, id: 'other', title: '새 전달', author_id: 'other-teacher' },
      { ...post, id: 'suggestion', title: '건의', author_id: 'other-teacher', category: 'suggestion' },
    ]));
    const comment = { created_at, author_name: '댓글선생님', content: '댓글' };
    localStorage.setItem('holoseogi-announcement-comments', JSON.stringify([
      { ...comment, id: 'c1', announcement_id: 'own', author_id: 'other-teacher' },
      { ...comment, id: 'c2', announcement_id: 'own', author_id: 'local-teacher' },
      { ...comment, id: 'c3', announcement_id: 'other', author_id: 'third-teacher' },
      { ...comment, id: 'c4', announcement_id: 'suggestion', author_id: 'third-teacher' },
    ]));
  });
  await page.goto('/');
  await page.getByRole('button', { name: '알림', exact: true }).click();
  const panel = page.locator('.notification-panel');
  await expect(panel.locator('.notification-row')).toHaveCount(2);
  await expect(panel.locator('.notification-row').first()).toContainText('5분 전');
  await panel.getByRole('button').filter({ hasText: '내 글에 댓글' }).click();
  await expect(page.getByRole('heading', { name: '내 글', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '본문', exact: true })).toContainText('짧은 본문');
  const height = await page.getByRole('region', { name: '본문', exact: true }).evaluate(el => el.getBoundingClientRect().height);
  expect(height).toBeGreaterThan(280);
  await page.reload();
  await page.getByRole('button', { name: '알림', exact: true }).click();
  await expect(panel.locator('.notification-row.unread')).toHaveCount(1);
  await panel.getByRole('button', { name: '모두 읽음' }).click();
  await expect(panel.locator('.notification-row.unread')).toHaveCount(0);
});
